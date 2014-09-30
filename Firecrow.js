var Firecrow =
{
    N_DependencyGraph: {},
    N_Interpreter: {},
    getDocument: function() {},
    isDebugMode: true,
    getWindow: function() { return frames[0] || window;},
    getDocument: function() { return this.getWindow().document; },
    INTERNAL_PROTOTYPE_FUNCTIONS:
    {
        Array:
        {
            concat: Array.concat, every: Array.every, forEach: Array.forEach,
            indexOf: Array.indexOf, join: Array.join, map: Array.map,
            pop: Array.pop, push: Array.push, reduce: Array.reduce,
            reduceRight: Array.reduceRight, reverse: Array.reverse,
            reverse: Array.reverse, shift: Array.shift, some: Array.some,
            sort: Array.sort, splice: Array.splice, unshift: Array.unshift
        },
        String:
        {
            camelCase: String.camelCase, capitalize: String.capitalize, charAt: String.charAt, charCodeAt: String.charAt,
            clean: String.clean, concat: String.concat, contains: String.contains, escapeRegExp: String.escapeRegExp,
            hyphenate: String.hyphenate, lastIndexOf: String.lastIndexOf, localeCompare: String.localeCompare, match: String.match,
            replace: String.replace, replace: String.replace, search: String.search, slice: String.slice,
            sub: String.sub, substitute: String.substitute, substr: String.substr, substring: String.substring, toFloat: String.toFloat,
            toInt: String.toInt, toLocaleLowerCase: String.toLocaleLowerCase, toLocaleString: String.toLocaleString,
            toLocaleUpperCase: String.toLocaleUpperCase, toLowerCase: String.toLowerCase, toUpperCase: String.toUpperCase, trim: String.trim,
            trimLeft: String.trimLeft, trimRight: String.trimRight, fromCharCode: String.fromCharCode
        }
    }
}