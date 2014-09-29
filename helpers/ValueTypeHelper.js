(function()
{
    Firecrow.ValueTypeHelper =
    {
        expand: function (base, expander)
        {
            if (base == null || expander == null) { return; }

            for (var prop in expander) {
                base[prop] = expander[prop];
            }
        },

        objectHasProperties: function (object)
        {
            if (object == null) { return false; }

            for (var prop in object) { return true; }

            return false;
        },

        getHighestIndexProperty: function (object)
        {
            if (object == null) { return null; }

            var highestIndex = Number.NEGATIVE_INFINITY;

            for (var prop in object)
            {
                if (this.isStringInteger(prop) || this.isInteger(prop))
                {
                    var number = prop * 1;

                    if (number > highestIndex)
                    {
                        highestIndex = number;
                    }
                }
            }

            if (highestIndex == Number.NEGATIVE_INFINITY)
            {
                return null;
            }

            return highestIndex;
        },

        isOfType: function (variable, className)
        {
            return variable instanceof className;
        },

        isOneOfTypes: function (variable, classNames)
        {
            for (var i = 0, length = classNames.length; i < length; i++)
            {
                if (this.isOfType(variable, classNames[i]))
                {
                    return true;
                }
            }

            return false;
        },

        isPrimitive: function (variable)
        {
            return typeof variable == "undefined" || typeof variable == "number"
                || typeof variable == "string" || typeof variable == "boolean"
                || variable == null;
        },

        arePrimitive: function ()
        {
            if (arguments.length == 0) { return false; }

            for (var i = 0; i < arguments.length; i++)
            {
                if (!this.isPrimitive(arguments[i]))
                {
                    return false;
                }
            }

            return true;
        },

        isFunction: function (variable)
        {
            return this.isOfType(variable, Function) || (typeof variable == "function");
        },

        isRegExp: function (variable)
        {
            if (variable == null) { return false; }

            return variable instanceof RegExp || (variable.constructor && variable.constructor.name == "RegExp");
        },

        isXMLHttpRequest: function (variable)
        {
            if (variable == null) { return false; }

            return variable instanceof XMLHttpRequest || (variable.constructor && variable.constructor.name == "XMLHttpRequest");
        },

        isBoolean: function (variable)
        {
            if (this.isNull(variable)) { return false; }

            return typeof(variable) == "boolean";
        },

        isString: function (variable)
        {
            if (this.isNull(variable)) { return false; }

            return (typeof variable) == "string" || variable instanceof String;
        },

        isNumber: function (variable)
        {
            if (this.isNull(variable)) { return false; }

            return (typeof variable) == "number";
        },

        isInteger: function (variable)
        {
            if (this.isNull(variable)) { return false; }

            return (typeof variable) == "number" && variable == parseInt(variable, 10);
        },

        isStringInteger: function (variable)
        {
            if (this.isNull(variable)) { return false; }

            return variable == parseInt(variable, 10);
        },

        isNull: function (variable)
        {
            return variable === null;
        },

        isObject: function (potentialObject)
        {
            if (potentialObject == null) { return false; }

            return 'object' == typeof potentialObject;
        },

        isEmptyObject: function (object)
        {
            if (object == null) { return false; }

            for (var prop in object)
            {
                if (object.hasOwnProperty(prop))
                {
                    return false;
                }
            }

            return true;
        },

        isArray: function (arrayOfElements)
        {
            if (this.isNull(arrayOfElements)) { return false; }

            var result = (typeof arrayOfElements) == "array" || arrayOfElements instanceof Array;

            if (result) { return true; }

            if (Array != null && Array.isArray != null) { return Array.isArray(arrayOfElements); }

            return result;
        },

        isArrayLike: function (arrayLike)
        {
            if (arrayLike == null || arrayLike.length === null || arrayLike.length === undefined)
            {
                return false;
            }

            return !this.isString(arrayLike);
        },

        isArrayOf: function (arrayOfElements, type)
        {
            if (!this.isArray(arrayOfElements))
            {
                return false;
            }

            for (var i = 0; i < arrayOfElements.length; i++)
            {
                if (!this.isOfType(arrayOfElements[i], type))
                {
                    return false;
                }
            }

            return true;
        },

        isStringArray: function (arrayOfElements)
        {
            if (!this.isArray(arrayOfElements))  { return false; }

            for (var i = 0; i < arrayOfElements.length; i++)
            {
                if (!this.isString(arrayOfElements[i]))
                {
                    return false;
                }
            }

            return true;
        },

        isIntegerArray: function (arrayOfElements)
        {
            if (!this.isArray(arrayOfElements)) {
                return false;
            }

            for (var i = 0; i < arrayOfElements.length; i++) {
                if (!this.isInteger(arrayOfElements[i])) {
                    return false;
                }
            }

            return true;
        },

        reverseArray: function (array) {
            if (array == null || array.length <= 1) {
                return;
            }

            var length = array.length;
            var halfLength = length / 2;

            for (var i = 0; i < halfLength; i++) {
                var temp = array[i];
                array[i] = array[length - i - 1];
                array[length - i - 1] = temp;
            }
        },

        arrayContains: function (array, item) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] === item) {
                    return true;
                }
            }

            return false;
        },

        deepClone: function (object)
        {
            try {
                return JSON.parse(JSON.stringify(object));
            }
            catch (e) {
                alert("Error when deep cloning object:" + e);
            }
        },

        flattenArray: function (array) {
            var flattened = [];

            for (var i = 0; i < array.length; i++) {
                var item = array[i];

                this.isArray(item) ? this.pushAll(flattened, item)
                    : flattened.push(item);
            }

            return flattened;
        },

        getSubList: function (array, startIndex, endIndex) {
            var subList = [];

            for (var i = startIndex; i < endIndex; i++) {
                subList.push(array[i]);
            }

            return subList;
        },

        getArraySum: function (array) {
            var sum = 0;

            for (var i = 0; i < array.length; i++) {
                sum += array[i];
            }

            return sum;
        },

        getWithoutFirstElement: function (array) {
            var withoutFirst = [];

            for (var i = 1; i < array.length; i++) {
                withoutFirst.push(array[i]);
            }

            return withoutFirst;
        },

        getRandomElementFromArray: function (array) {
            if (array == null) {
                return null;
            }

            return array[this.getRandomInt(0, array.length)];
        },

        getRandomInt: function (min, max) {
            return Math.floor(Math.random() * (max - min)) + min;
        },

        cleanDuplicatesFromArray: function (array) {
            var cleansedArray = [];

            for (var i = 0; i < array.length; i++) {
                if (!this.arrayContains(cleansedArray, array[i])) {
                    cleansedArray.push(array[i]);
                }
            }

            return cleansedArray;
        },

        sortArray: function (array) {
            for (var i = 0; i < array.length; i++) {
                for (var j = 0; j < array.length; j++) {
                    if (array[i] < array[j]) {
                        var temp = array[i];
                        array[i] = array[j];
                        array[j] = temp;
                    }
                }
            }

            return array;
        },

        createFilledIntArray: function (startIndex, endIndex) {
            var array = [];

            for (var currentNumber = startIndex; currentNumber <= endIndex; currentNumber++) {
                array.push(currentNumber);
            }

            return array;
        },

        removeAfter: function (string, character) {
            var index = string.indexOf(character);

            if (index >= 0) {
                return string.substr(0, index);
            }

            return string;
        },

        convertToArray: function (arrayLikeStructure) {
            var array = [];

            for (var i = 0; i < arrayLikeStructure.length; i++) {
                array.push(arrayLikeStructure[i]);
            }

            return array;
        },

        convertObjectMapToArray: function (object) {
            var array = [];

            for (var prop in object) {
                array.push(object[prop]);
            }

            return array;
        },

        convertObjectPropertyNamesToArray: function (object) {
            var array = [];

            for (var prop in object) {
                array.push(prop);
            }

            return array;
        },

        removeFromArrayByElement: function (array, element)
        {
            return this.removeFromArrayByIndex(array, array.indexOf(element));
        },

        removeFromArrayByIndex: function (array, index)
        {
            if (index < 0 || index >= array.length)
            {
                debugger;
                alert("Index out of range when removing array in ValueTypeHelper");
                return;
            }

            return array.splice(index, 1);
        },

        getArraysIntersection: function (firstArray, secondArray) {
            if (firstArray == null || secondArray == null || firstArray.length == 0 || secondArray.length == 0) {
                return [];
            }

            var intersection = [];

            for (var i = 0; i < firstArray.length; i++) {
                for (var j = 0; j < secondArray.length; j++) {
                    if (firstArray[i] == secondArray[j]) {
                        intersection.push(firstArray[i]);
                    }
                }
            }

            return intersection;
        },

        insertIntoStringAtPosition: function (baseString, insertionString, position) {
            if (baseString == "") {
                return insertionString;
            }
            if (insertionString == "") {
                return baseString;
            }

            return baseString.substr(0, position) + insertionString + baseString.substr(position);
        },

        insertIntoArrayAtIndex: function (array, element, index)
        {
            array.splice(index, 0, element);
        },

        insertElementsIntoArrayAtIndex: function (array, elements, index)
        {
            elements.forEach(function (element)
            {
                this.insertIntoArrayAtIndex(array, element, index++);
            }, this);
        },

        createArrayCopy: function (array)
        {
            if (array == null) { return []; }

            return array.slice();
        },

        concatArray: function (firstArray, secondArray)
        {
            if (firstArray == null) {
                return secondArray;
            }
            if (secondArray == null) {
                return firstArray;
            }

            var joinedArray = [];

            for (var i = 0; i < firstArray.length; i++) {
                joinedArray.push(firstArray[i]);
            }
            for (var i = 0; i < secondArray.length; i++) {
                joinedArray.push(secondArray[i]);
            }

            return joinedArray;
        },

        pushAll: function (baseArray, arrayWithItems)
        {
            baseArray.push.apply(baseArray, arrayWithItems);
        },

        findInArray: function (array, searchForItem, checkFunction)
        {
            for (var i = 0; i < array.length; i++)
            {
                var currentItem = array[i];

                if (checkFunction(currentItem, searchForItem))
                {
                    return currentItem;
                }
            }

            return null;
        },

        clearArray: function (array) {
            for (var i = 0; i < array.length; i++) {
                if (array[i] == null) {
                    array.splice(i, 1);
                    i--;
                }
            }
        },

        trim: function (str, chars) {
            return this.trimLeft(this.trimRight(str, chars), chars);
        },

        trimLeft: function (str, chars) {
            chars = chars || "\\s";
            return str.replace(new RegExp("^[" + chars + "]+", "g"), "");
        },

        trimRight: function (str, chars) {
            chars = chars || "\\s";
            return str.replace(new RegExp("[" + chars + "]+$", "g"), "");
        },

        regexIndexOf: function (string, regex, startpos) {
            var indexOf = string.substring(startpos || 0).search(regex);
            return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
        },

        //TODO - quickfixing the Firefox create RegEx from literal bug
        adjustForRegExBug: function (regExElement, regExString) {
            if (regExElement == null || regExElement.parent == null
                || regExElement.parent.loc == null || regExElement.parent.loc.source == null || regExElement.parent.loc.source.indexOf("medialize") == -1) {
                return regExString;
            }

            //IT seems that Firefox regEx functionality differs if it /someRegEx/gi or /someRegEx/ig -> bug, iritating bug
            //but in the parse tree it does not show //ig but //gi regardless of what is put
            //So if it is part of the medialize library that i'm testing do that replacement
            return regExString.replace(/\/gi$/, "/ig");
        },

        isHtmlElement: function (object) {
            if (object == null) {
                return false;
            }
            //It seems that Chrome creates new instances of HTML functions for each frame
            return object instanceof HTMLElement //works in Firefox
                || (object.nodeType == 1 && object.nodeName !== ""); //For Chrome
        },

        isDocumentFragment: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof DocumentFragment
                || (object.nodeType == 11 && object.nodeName !== "");
        },

        isImageElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof Image || object instanceof HTMLImageElement
                || (object.nodeType == 1 && object.nodeName === "IMG");
        },

        isCanvasElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLCanvasElement
                || (object.nodeType == 1 && object.nodeName === "CANVAS");
        },

        isScriptElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLScriptElement
                || (object.nodeType == 1 && object.nodeName === "SCRIPT");
        },

        isIFrameElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLScriptElement
                || (object.nodeType == 1 && object.nodeName === "IFRAME");
        },

        isTextNode: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof Text
                || (object.nodeType == 3 && object.nodeName !== "");
        },

        isComment: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof Text
                || (object.nodeType == 8 && object.nodeName !== "");
        },

        isDocument: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof Document
                || (object.nodeType == 9 && object.nodeName !== "");
        },

        isHtmlSelectElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLSelectElement
                || (object.nodeType == 1 && object.nodeName == "SELECT");
        },

        isHtmlInputElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLSelectElement
                || (object.nodeType == 1 && object.nodeName == "INPUT");
        },

        isHtmlTextAreaElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLTextAreaElement
                || (object.nodeType == 9 && object.nodeName == "TEXTAREA");
        },

        isHtmlFormElement: function (object) {
            if (object == null) {
                return false;
            }

            return object instanceof HTMLFormElement
                || (object.nodeType == 1 && object.nodeName == "FORM");
        }
    };
})();