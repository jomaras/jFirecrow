(function (){
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    var Object;
    Firecrow.N_Interpreter.Object = Object = function() {};

    fcInternals.Object.createObjectWithInit = function(globalObject, codeConstruct, implementationObject, proto)
    {
        return (new Object()).initObject(globalObject, codeConstruct, implementationObject, proto);
    }

    Object.LAST_ID = 0;
    Object.MONOLITIC_ARRAYS = true;

    Object.notifyError = function(message) { debugger; alert("Object - " + message); }

    Object.prototype =
    {
        initObject: function(globalObject, codeConstruct, implementationObject, proto)
        {
            this.id = Object.LAST_ID++;

            this.globalObject = globalObject;
            this.implementationObject = implementationObject;
            this.creationCodeConstruct = codeConstruct;

            this.properties = [];
            this.enumeratedProperties = [];
            this.modifications = [];
            this.propertyDeletionPositionMap = {};

            this.addProperty("__proto__", proto, codeConstruct, false);

            if(codeConstruct != null && globalObject != null)
            {
                this._addModification(codeConstruct, globalObject.getPreciseEvaluationPositionId());
            }

            this.objectModifiedCallbackDescriptors = null;
            this.addPropertyCallbackDescriptors = null;
            this.getPropertyCallbackDescriptors = null;

            if(this.globalObject.executionContextStack != null)
            {
                this.creationContext = this.globalObject.executionContextStack.activeContext;
            }

            return this;
        },

        deconstructObject: function()
        {
            delete this.globalObject;
            delete this.implementationObject;
            delete this.creationCodeConstruct;

            delete this.properties;
            delete this.enumeratedProperties;
            delete this.modifications;

            delete this.objectModifiedCallbackDescriptors;
            delete this.addPropertyCallbackDescriptors;
            delete this.getPropertyCallbackDescriptors;

            delete this.creationContext;
        },

        getOwnProperty: function(propertyName)
        {
            return ValueTypeHelper.findInArray
            (
                this.properties,
                propertyName,
                function(property, propertyName) { return property.name == propertyName; }
            );
        },

        getEnumeratedPropertyNames: function()
        {
            return this._getEnumeratedPropertiesFromImplementationObject();
        },

        getOwnPropertyNames: function()
        {
            var propertyNames = [];

            var properties = this.properties;

            for(var i = 0, propertyLength = properties.length; i < propertyLength; i++)
            {
                propertyNames.push(properties[i].name);
            }

            return propertyNames;
        },

        isOwnProperty: function(propertyName)
        {
            return this.getOwnProperty(propertyName) != null;
        },

        getInternalPrototypeChain: function()
        {
            var prototypeChain = this.getPrototypeChain().concat([this]);

            var internalPrototypeChain = [];

            for(var i = 0; i < prototypeChain.length; i++)
            {
                if(this.globalObject.isInternalPrototype(prototypeChain[i]))
                {
                    internalPrototypeChain.push(prototypeChain[i]);
                }
            }

            return internalPrototypeChain;
        },

        getPrototypeChain: function()
        {
            var chain = [];

            if(this.proto != null)
            {
                chain.push(this.proto.iValue);
                ValueTypeHelper.pushAll(chain, this.proto.iValue.getPrototypeChain());
            }

            return chain;
        },

        getProperty: function(propertyName, readPropertyConstruct)
        {
            var property = this.getOwnProperty(propertyName);

            if(property != null)
            {
                this._callCallbacks(this.getPropertyCallbackDescriptors, [readPropertyConstruct, propertyName]);

                return property;
            }

            if(this.proto == null) { return null; }

            property = this.proto.iValue.getProperty(propertyName, readPropertyConstruct);

            this._addDependenciesToPrototypeProperty(property, readPropertyConstruct);

            return property;
        },

        getJsPropertyValue: function(propertyName, codeConstruct)
        {
            return this.getPropertyValue(propertyName, codeConstruct);
        },

        getPropertyValue: function(propertyName, codeConstruct)
        {
            var property = this.getProperty(propertyName, codeConstruct);

            return property != null ? property.value
                : undefined;
        },

        getLastPropertyModifications: function(codeConstruct)
        {
            var propertyNames = this._getEnumeratedPropertiesFromImplementationObject();

            var lastModifications = [];

            for(var i = 0, length = propertyNames.length; i < length; i++)
            {
                var property = this.getProperty(propertyNames[i], codeConstruct);

                if(property != null && property.lastModificationPosition != null)
                {
                    lastModifications.push(property.lastModificationPosition);
                }
            }

            return lastModifications;
        },

        getPropertyNames: function()
        {
            return this._getEnumeratedPropertiesFromImplementationObject();
        },

        getPropertyNameAtIndex: function(index, codeConstruct)
        {
            var propertyName = this._getEnumeratedPropertiesFromImplementationObject()[index];
            return this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, propertyName);
        },

        getPropertiesWithIndexNames: function()
        {
            var indexProperties = [];

            for(var i = 0; i < this.properties.length; i++)
            {
                if(ValueTypeHelper.isInteger(parseInt(this.properties[i].name)))
                {
                    indexProperties.push(this.properties[i]);
                }
            }

            return indexProperties;
        },

        getUserDefinedProperties: function()
        {
            var userDefinedProperties = [];

            for(var i = 0; i < this.properties.length; i++)
            {
                var property = this.properties[i];

                if(property.declarationPosition != null)
                {
                    userDefinedProperties.push(property);
                }
            }

            return userDefinedProperties;
        },

        addProperty: function(propertyName, propertyValue, codeConstruct, isEnumerable, optConfigurable, optWritable)
        {
            if(this.preventExtensions) { return; }
            if(propertyName == "__proto__") { this.setProto(propertyValue, codeConstruct); return; }

            var property = this.getOwnProperty(propertyName);

            if(property == null)
            {
                property = new Firecrow.N_Interpreter.Identifier(propertyName, propertyValue, codeConstruct, this.globalObject);

                this.properties.push(property);

                if(isEnumerable) { this.enumeratedProperties.push(property); }
            }
            else
            {
                property.setValue(propertyValue, codeConstruct);
            }

            if(isEnumerable === true || isEnumerable === false)
            {
                property.enumerable = isEnumerable;
            }

            if(optConfigurable === true || optConfigurable === false)
            {
                property.configurable = optConfigurable;
            }

            if(optWritable === true || optWritable === false)
            {
                property.writable = optWritable;
            }

            if(propertyName == "prototype" && propertyValue != null && codeConstruct != null)
            {
                this.prototypeDefinitionConstruct = { codeConstruct: codeConstruct, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()};
            }

            if(codeConstruct != null)
            {
                this._addModification(codeConstruct, this.globalObject.getPreciseEvaluationPositionId(), propertyName);
            }

            this._callCallbacks(this.addPropertyCallbackDescriptors, [propertyName, propertyValue, codeConstruct]);
        },

        setProto: function(proto, codeConstruct)
        {
            this.proto = proto;

            if(this.implementationObject != null && proto != null)
            {
                try
                {
                    //Firefox throws an exception
                    this.implementationObject.__proto__ = proto.jsValue;
                }
                catch(e)
                {
                    //debugger;
                }
            }

            if(codeConstruct != null)
            {
                this._addModification(codeConstruct, this.globalObject.getPreciseEvaluationPositionId());
            }
        },

        deleteProperty: function(propertyName, codeConstruct)
        {
            for(var i = 0; i < this.properties.length; i++)
            {
                if(this.properties[i].name == propertyName)
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.properties, i);
                    this.propertyDeletionPositionMap[propertyName] =
                    {
                        codeConstruct: codeConstruct,
                        evaluationPosition: this.globalObject.getPreciseEvaluationPositionId()
                    };
                    this._addModification(codeConstruct, this.globalObject.getPreciseEvaluationPositionId(), propertyName);
                    break;
                }
            }

            for(var i = 0; i < this.enumeratedProperties.length; i++)
            {
                if(this.enumeratedProperties[i].name == propertyName)
                {
                    ValueTypeHelper.removeFromArrayByIndex(this.enumeratedProperties, i);
                    break;
                }
            }
        },

        getPropertyDeletionPosition: function(propertyName)
        {
            return this.propertyDeletionPositionMap[propertyName];
        },

        registerPreventExtensionPosition: function(codeConstruct)
        {
            this.preventExtensionPosition = { codeConstruct : codeConstruct, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId() };
        },

        isPrimitive: function() { return false },

        registerObjectModifiedCallbackDescriptor: function(callback, thisValue)
        {
            if(this.objectModifiedCallbackDescriptors == null) { this.objectModifiedCallbackDescriptors = [];}

            this.objectModifiedCallbackDescriptors.push({callback: callback, thisValue: thisValue});
        },

        registerGetPropertyCallback: function(callback, thisValue)
        {
            if(this.getPropertyCallbackDescriptors == null) { this.getPropertyCallbackDescriptors = []; }

            this.getPropertyCallbackDescriptors.push({ callback: callback, thisValue: thisValue});
        },

        registerAddPropertyCallback: function(callback, thisValue)
        {
            if(this.addPropertyCallbackDescriptors == null) { this.addPropertyCallbackDescriptors = []; }

            this.addPropertyCallbackDescriptors.push({ callback: callback, thisValue: thisValue});
        },

        _callCallbacks: function(callbackDescriptors, args)
        {
            if(callbackDescriptors == null || callbackDescriptors.length == 0) { return; }

            for(var i = 0, length = callbackDescriptors.length; i < length; i++)
            {
                var callbackDescriptor = callbackDescriptors[i];
                callbackDescriptor.callback.apply(callbackDescriptor.thisValue, args);
            }
        },

        addDependencyToAllModifications: function(codeConstruct, modifications)
        {
            modifications = modifications || this.modifications;
            if(codeConstruct == null || modifications == null || modifications.length == 0 || !Object.MONOLITIC_ARRAYS) { return; }

            var evaluationPosition = this.globalObject.getPreciseEvaluationPositionId();

            for(var i = 0, length = modifications.length; i < length; i++)
            {
                var modification = modifications[i];

                this.globalObject.dependencyCreator.createDataDependency
                (
                    codeConstruct,
                    modification.codeConstruct,
                    evaluationPosition,
                    modification.evaluationPositionId
                );
            }
        },

        addDependenciesToAllProperties: function(codeConstruct)
        {
            if(codeConstruct == null || !fcInternals.Object.MONOLITIC_ARRAYS) { return; }

            if(this.dummyDependencyNode == null)
            {
                this.dummyDependencyNode = { type: "DummyCodeElement", id: this.id, mainObjectCreationCodeConstruct: this.creationCodeConstruct, nodeId: "D" + this.globalObject.DYNAMIC_NODE_COUNTER++};
                this.globalObject.browser.callNodeCreatedCallbacks(this.dummyDependencyNode, "js", true);
            }

            this.globalObject.dependencyCreator.createDataDependency
            (
                codeConstruct,
                this.dummyDependencyNode,
                this.globalObject.getPreciseEvaluationPositionId()
            );
        },

        addModification: function(codeConstruct, propertyName)
        {
            if(codeConstruct == null) { return; }

            this._addModification(codeConstruct, this.globalObject.getPreciseEvaluationPositionId(), propertyName);
        },

        _addModification: function(codeConstruct, evaluationPositionId, propertyName)
        {
            if(codeConstruct == null) { return; }
            if(!ValueTypeHelper.isStringInteger(propertyName) && propertyName != "length") { return; }

            var modificationDescription = { codeConstruct: codeConstruct, evaluationPositionId: evaluationPositionId };

            this.modifications.push(modificationDescription);

            this._callCallbacks(this.objectModifiedCallbackDescriptors, [modificationDescription]);
        },

        _addDependenciesToPrototypeProperty: function(property, readPropertyConstruct)
        {
            if(property == null) { return; }

            if(this.prototypeDefinitionConstruct != null)
            {
                this.globalObject.dependencyCreator.createDataDependency
                (
                    readPropertyConstruct,
                    this.prototypeDefinitionConstruct.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    this.prototypeDefinitionConstruct.evaluationPositionId
                );
            }

            if(property.lastModificationPosition != null)
            {
                this.globalObject.dependencyCreator.createDataDependency
                (
                    readPropertyConstruct,
                    property.lastModificationPosition.codeConstruct,
                    this.globalObject.getPreciseEvaluationPositionId(),
                    property.lastModificationPosition.evaluationPositionId
                );
            }
        },

        _getEnumeratedPropertiesFromImplementationObject: function()
        {
            var properties = [];

            if(this.implementationObject != null)
            {
                for(var property in this.implementationObject)
                {
                    //TODO - possible problem
                    if(property == "constructor" && !this.implementationObject.hasOwnProperty(property)) { continue; }

                    properties.push(property);
                }
            }

            return properties;
        },

        isDefinedInCurrentContext: function()
        {
            return this.creationContext == this.globalObject.executionContextStack.activeContext;
        }
    };

    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    Firecrow.N_Interpreter.ObjectExecutor =
    {
        isInternalObjectMethod: function(potentialFunction)
        {
            var methods = Firecrow.N_Interpreter.ObjectFunction.CONST.INTERNAL_PROPERTIES.METHODS;

            for(var i = 0; i < methods.length; i++)
            {
                if(Object[methods[i]] === potentialFunction)
                {
                    return true;
                }
            }

            return false;
        },

        executeInternalMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            if(functionObject.jsValue.name == "hasOwnProperty")
            {
                return this._executeHasOwnProperty(thisObject, args, callExpression);
            }
            else if (functionObject.jsValue.name == "toString")
            {
                var result = "";

                if(callCommand != null && (callCommand.isCall || callCommand.isApply))
                {
                    result = Object.prototype.toString.call(thisObject.jsValue);
                }
                else
                {
                    result = thisObject.jsValue.toString();
                }

                return functionObject.iValue.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
            }
            else
            {
                Object.notifyError("Unknown ObjectExecutor method");
            }
        },

        executeInternalObjectFunctionMethod: function(thisObject, functionObject, args, callExpression, callCommand)
        {
            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue != null ? fcThisValue.globalObject
                : functionObjectValue.fcValue.iValue.globalObject;
            var argumentValues = globalObject.getJsValues(args);

            switch(functionName)
            {
                case "create":
                    return this._executeCreate(callExpression, args, globalObject);
                case "defineProperty":
                    return this._executeDefineProperty(callExpression, args, globalObject);
                case "defineProperties":
                    return this._executeDefineProperties(callExpression, args, globalObject);
                case "getOwnPropertyDescriptor":
                    return this._executeGetOwnPropertyDescriptor(callExpression, args, globalObject);
                case "getOwnPropertyNames":
                    return this._getOwnPropertyNames(callExpression, args, globalObject);
                case "keys":
                    return this._executeKeys(callExpression, args, globalObject);
                case "getPrototypeOf":
                    return this._executeGetPrototypeOf(callExpression, args, globalObject);
                case "preventExtensions":
                    return this._preventExtensions(callExpression, args, globalObject);
                case "isExtensible":
                    return this._isExtensible(callExpression, args, globalObject);
                case "seal":
                    return this._seal(callExpression, args, globalObject);
                case "isSealed":
                    return this._isSealed(callExpression, args, globalObject);
                case "propertyIsEnumerable":
                    return this._propertyIsEnumerable(thisObject, argumentValues, globalObject, callExpression)
                default:
                    debugger;
                    alert("Object Function unhandled function: " + functionName);
            }
        },

        _executeCreate: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.create with zero parameters"); return null; }

            var baseObject = {};

            var newlyCreatedObject = new fcInternals.fcValue
            (
                baseObject,
                fcInternals.Object.createObjectWithInit(globalObject, callExpression, baseObject, args[0]),
                callExpression
            );

            if(args.length > 1)
            {
                this._definePropertiesOnObject(newlyCreatedObject, args[1], globalObject, callExpression);
            }

            return newlyCreatedObject;
        },

        _executeDefineProperties: function(callExpression, args, globalObject)
        {
            if(args.length < 2) { Object.notifyError("Object.defineProperties can not have less than 2 arguments"); return null;}

            this._definePropertiesOnObject(args[0], args[1], globalObject, callExpression);
        },

        _definePropertiesOnObject: function(fcBaseObject, propertyDescriptorsMap, globalObject, callExpression)
        {
            var jsPropertyDescriptorsMap = propertyDescriptorsMap.jsValue;
            var fcPropertyDescriptorsMap = propertyDescriptorsMap.iValue;

            var iObject = fcBaseObject.iValue;

            var dependencyCreator = globalObject.dependencyCreator;

            for(var propName in jsPropertyDescriptorsMap)
            {
                var propertyDescriptor = fcPropertyDescriptorsMap.getPropertyValue(propName);

                var configurable = this._getPropertyDescriptorValue(propertyDescriptor.jsValue, "configurable", false);
                var enumerable = this._getPropertyDescriptorValue(propertyDescriptor.jsValue, "enumerable", false);
                var writable = this._getPropertyDescriptorValue(propertyDescriptor.jsValue, "writable", false);
                var get = this._getPropertyDescriptorValue(propertyDescriptor.jsValue, "get", null);
                var set = this._getPropertyDescriptorValue(propertyDescriptor.jsValue, "set", null);

                if(get != null || set != null) { Object.notifyError("Still does not handle defining getters and setters"); return; }

                var propertyValue = propertyDescriptor.iValue.getPropertyValue("value");

                dependencyCreator.createDataDependency(propertyDescriptor.codeConstruct, callExpression);
                dependencyCreator.createDependenciesForObjectPropertyDefinition(propertyDescriptor.codeConstruct);

                Object.defineProperty(fcBaseObject.jsValue, propName,
                {
                    configurable: configurable,
                    enumerable: enumerable,
                    writable: writable,
                    value: propertyValue
                });

                iObject.addModification(callExpression, propName);
                iObject.addProperty(propName, propertyValue, propertyDescriptor.codeConstruct, enumerable, configurable, writable);
            }
        },

        _executeDefineProperty: function(callExpression, args, globalObject)
        {
            if(args.length < 3) { Object.notifyError("Can not call Object.defineProperty with less than 3 parameters"); return; }

            var propertyName = args[1].jsValue;

            var jsPropertyDescriptorMap = args[2].jsValue;

            var configurable = this._getPropertyDescriptorValue(jsPropertyDescriptorMap, "configurable", false);
            var enumerable = this._getPropertyDescriptorValue(jsPropertyDescriptorMap, "enumerable", false);
            var writable = this._getPropertyDescriptorValue(jsPropertyDescriptorMap, "writable", false);
            var get = this._getPropertyDescriptorValue(jsPropertyDescriptorMap, "get", null);
            var set = this._getPropertyDescriptorValue(jsPropertyDescriptorMap, "set", null);
            var value = jsPropertyDescriptorMap.value;

            if(get != null || set != null) { Object.notifyError("Still does not handle defining getters and setters"); return; }
            if(value == null) { Object.notifyError("Value must be set when definining property"); return; }

            args[0].iValue.addModification(callExpression, propertyName);

            var dependencyCreator = globalObject.dependencyCreator;

            dependencyCreator.createDataDependency(args[2].codeConstruct, callExpression);
            dependencyCreator.createDependenciesForObjectPropertyDefinition(args[2].codeConstruct);

            window.Object.defineProperty(args[0].jsValue, propertyName,
            {
                configurable: configurable,
                enumerable: enumerable,
                writable: writable,
                value: value
            });

            args[0].iValue.addProperty(propertyName, jsPropertyDescriptorMap.value, args[2].codeConstruct, enumerable, configurable, writable);
        },

        _executeGetOwnPropertyDescriptor: function(callExpression, args, globalObject)
        {
            if(args.length < 1) { Object.notifyError("Can not call getOwnPropertyDescriptor with 0 arguments"); return null; }

            if(args.length == 1) { return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined); }

            var property = args[0].iValue.getOwnProperty(args[1].jsValue);

            if(property == null) { return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, undefined); }

            var baseObject = {};

            var newlyCreatedObject = new Firecrow.N_Interpreter.fcValue
            (
                baseObject,
                Object.createObjectWithInit(globalObject, callExpression, baseObject),
                callExpression
            );

            baseObject.configurable = globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, property.configurable);
            baseObject.enumerable = globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, property.enumerable);
            baseObject.writable = globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, property.writable);
            baseObject.value = property.value;

            newlyCreatedObject.iValue.addProperty("configurable", baseObject.configurable, callExpression, true, true, true);
            newlyCreatedObject.iValue.addProperty("enumerable", baseObject.enumerable, callExpression, true, true, true);
            newlyCreatedObject.iValue.addProperty("writable", baseObject.writable, callExpression, true, true, true);
            newlyCreatedObject.iValue.addProperty("value", baseObject.value, callExpression, true, true, true);

            return newlyCreatedObject;
        },

        _executeKeys: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.keys with 0 arguments"); return null; }

            if(args[0] == null || args[0].iValue == null) { Object.notifyError("Object keys argument hast to have iValue"); return null; }

            return this._createArrayFromPropertyNames(args[0].iValue, args[0].iValue.getEnumeratedPropertyNames(), globalObject, callExpression);
        },

        _getOwnPropertyNames: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.keys with 0 arguments"); return null; }

            if(args[0] == null || args[0].iValue == null) { Object.notifyError("Object keys argument hast to have iValue"); return null; }

            return this._createArrayFromPropertyNames(args[0].iValue, args[0].iValue.getOwnPropertyNames(), globalObject, callExpression);
        },

        _executeGetPrototypeOf: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.getPrototypeOf with 0 arguments"); return null; }

            if(args[0] == null || args[0].iValue == null) { Object.notifyError("Object getPrototypeOf argument hast to have iValue"); return null; }

            return args[0].iValue.proto;
        },

        _preventExtensions: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.preventExtensions with 0 arguments"); return null; }

            if(args[0] == null || args[0].iValue == null) { Object.notifyError("Object preventExtensions argument hast to have iValue"); return null; }

            Object.preventExtensions(args[0].jsValue);
            args[0].iValue.preventExtensions = true;
            args[0].iValue.registerPreventExtensionPosition(callExpression);

            return args[0];
        },

        _isExtensible: function(callExpression, args, globalObject)
        {
            if(args.length == 0) { Object.notifyError("Can not call Object.isExtensible with 0 arguments"); return null; }

            if(args[0] == null || args[0].iValue == null) { Object.notifyError("Object isExtensible argument hast to have iValue"); return null; }

            var dependencyCreator = globalObject.dependencyCreator;

            if(args[0].iValue.preventExtensionPosition != null)
            {
                dependencyCreator.createDataDependency(callExpression, args[0].iValue.preventExtensionPosition.codeConstruct, args[0].iValue.preventExtensionPosition.evaluationPositionId);
            }

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, !args[0].iValue.preventExtensions);
        },

        _propertyIsEnumerable: function(thisObject, argumentValues, globalObject, callExpression)
        {
            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, thisObject.jsValue.propertyIsEnumerable(argumentValues[0]));
        },

        _createArrayFromPropertyNames: function(iObject, propertyNames, globalObject, callExpression)
        {
            var propertyKeysArray = [];

            for(var i = 0; i < propertyNames.length; i++)
            {
                var propertyName = propertyNames[i];

                var property = iObject.getProperty(propertyName);

                if(property == null) { continue; }

                var propertyConstruct = property.declarationPosition != null ? property.declarationPosition.codeConstruct : null;

                propertyKeysArray.push
                (
                    globalObject.internalExecutor.createInternalPrimitiveObject
                    (
                        propertyConstruct,
                        propertyName
                    )
                );
            }

            return globalObject.internalExecutor.createArray(callExpression, propertyKeysArray);
        },

        _getPropertyDescriptorValue: function(propertyDescriptorMap, propertyName, defaultValue)
        {
            return propertyDescriptorMap[propertyName] != null ? propertyDescriptorMap[propertyName].jsValue
                : defaultValue;
        },

        executeInternalConstructor: function(constructorConstruct, args, globalObject)
        {
            var newlyCreatedObject = null;

            if (args.length == 0)
            {
                return globalObject.internalExecutor.createNonConstructorObject(constructorConstruct, new Object());
            }

            var firstArgument = args[0];

            if(firstArgument.jsValue == null)
            {
                return globalObject.internalExecutor.createNonConstructorObject(constructorConstruct, new Object(firstArgument.jsValue));
            }
            else if (ValueTypeHelper.isBoolean(firstArgument.jsValue))
            {
                return new Firecrow.N_Interpreter.fcValue
                (
                    new Boolean(firstArgument.jsValue),
                    new fcInternals.Boolean(firstArgument.jsValue, globalObject, constructorConstruct),
                    constructorConstruct
                );
            }
            else if(ValueTypeHelper.isString(firstArgument.jsValue))
            {
                return new Firecrow.N_Interpreter.fcValue
                (
                    new String(firstArgument.jsValue),
                    new Firecrow.N_Interpreter.String(firstArgument.jsValue, globalObject, constructorConstruct),
                    constructorConstruct
                );
            }
            else if(ValueTypeHelper.isNumber(firstArgument.jsValue))
            {
                return new Firecrow.N_Interpreter.fcValue
                (
                    new Number(firstArgument.jsValue),
                    new Firecrow.N_Interpreter.Number(firstArgument.jsValue, globalObject, constructorConstruct),
                    constructorConstruct
                );
            }
            else
            {
                return args[0];
            }
        },

        _executeHasOwnProperty: function(thisObject, args, callExpression)
        {
            if(thisObject == null || thisObject.iValue == null || args == null || args.length <= 0) { Object.notifyError("Invalid argument when executing hasOwnProperty");}

            var result = thisObject.iValue.isOwnProperty(args[0].jsValue);

            return thisObject.iValue.globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
        }
    };

    Firecrow.N_Interpreter.ObjectFunction = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("prototype", globalObject.fcObjectPrototype);

        this.isInternalFunction = true;
        this.name = "Object";

        Firecrow.N_Interpreter.ObjectFunction.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    window.Object[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    Firecrow.N_Interpreter.ObjectFunction.prototype = new fcInternals.Object();

    Firecrow.N_Interpreter.ObjectFunction.CONST =
    {
        INTERNAL_PROPERTIES:
        {
            METHODS:
            [
                "create", "defineProperty", "defineProperties", "getOwnPropertyDescriptor",
                "keys", "getOwnPropertyNames", "getPrototypeOf", "preventExtensions", "seal",
                "isSealed", "freeze", "isFrozen", "isExtensible", "propertyIsEnumerable"
            ]
        }
    };

    Firecrow.N_Interpreter.ObjectPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = Firecrow.N_Interpreter.ObjectPrototype;
        this.name = "ObjectPrototype";
    };

    Firecrow.N_Interpreter.ObjectPrototype.prototype = new fcModel.Object();
    Firecrow.N_Interpreter.ObjectPrototype.prototype.initMethods = function()
    {
        Firecrow.N_Interpreter.ObjectPrototype.CONST.INTERNAL_PROPERTIES.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    Object.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(this.globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    Firecrow.N_Interpreter.ObjectPrototype.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS: ["toString", "hasOwnProperty", "isPrototypeOf", "valueOf", "propertyIsEnumerable"]
        }
    };
})();