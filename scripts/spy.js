const fs = require('fs')
const path = require('path')

const OUTPUT_FILE = path.resolve(process.cwd(), 'api/routes.json')
const TARGET_MODULE_ID = 122

const routes = []
let saveTimer

function flushAndExit() {
	const json = JSON.stringify(routes, null, 2)
	fs.writeFileSync(OUTPUT_FILE, json, 'utf8')
	console.log(
		`[spy.js] Done. Saved ${routes.length} routes to ${OUTPUT_FILE}`
	)
	process.exit(0)
}

const originalCall = Function.prototype.call

Function.prototype.call = function (...args) {
	// Run the actual code first so module.exports is populated
	const result = originalCall.apply(this, args)

	// Check if this is the Webpack require call we are looking for
	if (args.length === 4 && args[3]?.name === '__webpack_require__') {
		const moduleObj = args[1]

		// Check for our target Router module
		if (moduleObj && moduleObj.i === TARGET_MODULE_ID) {
			console.log(
				`[spy.js] Target Module ${TARGET_MODULE_ID} intercepted.`
			)
			Function.prototype.call = originalCall
			patchModule(moduleObj)
		}
	}

	return result
}

function patchModule(moduleObj) {
	const OriginalRouter = moduleObj.exports

	// Create a wrapper class that extends the original
	function HookedRouter(...routerArgs) {
		// Instantiate the original router
		const instance = new (Function.prototype.bind.apply(OriginalRouter, [
			null,
			...routerArgs
		]))()

		// Patch the .route() method on this specific instance
		const originalRoute = instance.route

		instance.route = function (path) {
			// Register the route internally
			const routeObject = originalRoute.apply(this, arguments)

			// Normalize path
			const pathStr = path instanceof RegExp ? path.toString() : path

			// Create record
			const routeRecord = { path: pathStr, methods: [] }
			routes.push(routeRecord)

			// Hook verbs (get, post, etc) to capture methods
			;['get', 'post', 'put', 'delete', 'patch', 'all'].forEach(verb => {
				const originalVerb = routeObject[verb]
				if (typeof originalVerb === 'function') {
					routeObject[verb] = function (...handlers) {
						if (!routeRecord.methods.includes(verb)) {
							routeRecord.methods.push(verb)
						}
						return originalVerb.apply(this, handlers)
					}
				}
			})

			// Reset the debounce timer on every new route discovery
			clearTimeout(saveTimer)
			saveTimer = setTimeout(flushAndExit, 1000)

			return routeObject
		}

		return instance
	}

	// Copy static properties and prototype to ensure 'instanceof' and static methods work
	Object.assign(HookedRouter, OriginalRouter)
	HookedRouter.prototype = OriginalRouter.prototype

	// Overwrite the export
	moduleObj.exports = HookedRouter
}

console.log('[spy.js] Hook loaded. Waiting for Webpack bundle...')
