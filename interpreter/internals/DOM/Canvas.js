(function(){
/*************************************************************************************/
    //https://developer.mozilla.org/en-US/docs/DOM/CanvasRenderingContext2D

    var CanvasPrototype;
    Firecrow.N_Interpreter.CanvasPrototype = CanvasPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = CanvasPrototype;
        this.name = "CanvasPrototype";

        ["getContext", "toDataURL", "toBlob"].forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    HTMLCanvasElement.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this)
                ),
                null,
                false
            );
        }, this);
    };

    CanvasPrototype.prototype = new Firecrow.N_Interpreter.Object();

    var CanvasContext;

    Firecrow.N_Interpreter.CanvasContext = CanvasContext = function(globalObject, canvasContext, canvas)
    {
        this.initObject(globalObject);
        this.addProperty("__proto__", this.globalObject.fcCanvasContextPrototype);
        this.constructor = CanvasContext;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
    };

    CanvasContext.prototype = new fcInternals.Object();

    CanvasContext.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasContext[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    CanvasContext.CONST =
    {
        METHODS:
        [
            "arc", "arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "createImageDate", "createLinearGradient",
            "createPattern", "createRadialGradient", "drawImage", "drawCustomFocusRing", "fill", "fillRect", "fillText", "getImageData",
            "getLineDash", "isPointInPath", "lineTo", "measureText", "moveTo", "putImageData", "quadraticCurveTo", "rect", "restore",
            "rotate", "save", "scale", "scrollPathIntoView", "setLineDash", "setTransform", "stroke", "strokeRect", "strokeText",
            "transform", "translate"
        ]
    };

    var CanvasContextPrototype;

    Firecrow.N_Interpreter.CanvasContextPrototype = CanvasContextPrototype = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("__proto__", this.globalObject.fcObjectPrototype);
        this.name = "CanvasContextPrototype";

        CanvasContext.CONST.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new Firecrow.N_Interpreter.fcValue
                (
                    CanvasRenderingContext2D.prototype[propertyName],
                    Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    CanvasContextPrototype.prototype = new fcInternals.Object();

    var CanvasExecutor;

    Firecrow.N_Interpreter.CanvasExecutor = CanvasExecutor =
    {
        executeCanvasMethod: function(thisObject, functionObject, args, callExpression)
        {
            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue != null ? functionObjectValue.name : functionObject.iValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments =  globalObject.getJsValues(args)

            if(functionName == "getContext")
            {
                var jsCanvasContext = thisObjectValue.getContext.apply(thisObjectValue, jsArguments);

                return new Firecrow.N_Interpreter.fcValue(jsCanvasContext, new CanvasContext(globalObject, jsCanvasContext, thisObjectValue), callExpression);
            }
        }
    };

    fcInternals.CanvasContextExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments = globalObject.getJsValues(args);

            try
            {
                var result = thisObjectValue[functionName].apply(thisObjectValue, jsArguments);
            }
            catch(e)
            {
                //TODO - drawImage fails if the image is not loaded - and since where the model is executed
                //and where the image points to is not in the same location - the image can not be loaded
                //and draw image returns an exception!
                //console.log(e);
            }

            if(functionName == "createLinearGradient")
            {
                return new Firecrow.N_Interpreter.fcValue(result, new fcInternals.LinearGradient(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else if (functionName == "createRadialGradient")
            {
                return new Firecrow.N_Interpreter.fcValue(result, new fcInternals.CanvasGradient(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else if (functionName == "getImageData")
            {
                return new Firecrow.N_Interpreter.fcValue(result, new fcInternals.ImageData(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else
            {
                thisObject.iValue.canvas.elementModificationPoints.push({ codeConstruct: callExpression, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()});
                Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

                return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
            }
        }
    };

    var LinearGradient;

    Firecrow.N_Interpreter.LinearGradient = LinearGradient = function(globalObject, canvasContext, canvas, linearGradient)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.LinearGradient;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.linearGradient = linearGradient;

        this.addProperty
        (
            "addColorStop", new Firecrow.N_Interpreter.fcValue(this.linearGradient.addColorStop, Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };

    LinearGradient.prototype = new Firecrow.N_Interpreter.Object();

    LinearGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.linearGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    var LinearGradientExecutor;

    Firecrow.N_Interpreter.LinearGradientExecutor = LinearGradientExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments =  globalObject.getJsValues(args);

            thisObjectValue[functionName].apply(thisObjectValue, jsArguments);

            thisObject.iValue.canvas.elementModificationPoints.push({ codeConstruct: callExpression, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()});
            Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
        }
    };

    var CanvasGradient;
    Firecrow.N_Interpreter.CanvasGradient = CanvasGradient = function(globalObject, canvasContext, canvas, canvasGradient)
    {
        this.initObject(globalObject);
        this.constructor = CanvasGradient;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.canvasGradient = canvasGradient;

        this.addProperty
        (
            "addColorStop", new Firecrow.N_Interpreter.fcValue(this.canvasGradient.addColorStop, Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };

    CanvasGradient.prototype = new Firecrow.N_Interpreter.Object();

    CanvasGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    CanvasGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    var CanvasGradientExecutor;
    Firecrow.N_Interpreter.CanvasGradientExecutor = CanvasGradientExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments =  globalObject.getJsValues(args);

            thisObjectValue[functionName].apply(thisObjectValue, jsArguments);

            thisObject.iValue.canvas.elementModificationPoints.push({ codeConstruct: callExpression, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()});
            Firecrow.N_Interpreter.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
        }
    };

    var ImageData;
    Firecrow.N_Interpreter.ImageData = ImageData = function(globalObject, canvasContext, canvas, imageData)
    {
        this.initObject(globalObject);
        this.constructor = ImageData;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.imageData = imageData;

        this.addProperty("data")

        this.addProperty
        (
            "addColorStop", new Firecrow.N_Interpreter.fcValue(this.canvasGradient.addColorStop, Firecrow.N_Interpreter.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };
/*************************************************************************************/
})();