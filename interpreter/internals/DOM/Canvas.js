(function(){
/*************************************************************************************/
//https://developer.mozilla.org/en-US/docs/DOM/CanvasRenderingContext2D
    var fcInternals = Firecrow.Interpreter.Internals;

    fcInternals.CanvasPrototype = function(globalObject)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.CanvasPrototype;
        this.name = "CanvasPrototype";

        ["getContext", "toDataURL", "toBlob"].forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    HTMLCanvasElement.prototype[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null,
                    null
                ),
                null,
                false
            );
        }, this);
    };

    fcInternals.CanvasPrototype.prototype = new fcInternals.Object();

    fcInternals.CanvasContext = function(globalObject, canvasContext, canvas)
    {
        this.initObject(globalObject);
        this.addProperty("__proto__", this.globalObject.fcCanvasContextPrototype);
        this.constructor = fcInternals.CanvasContext;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
    };

    fcInternals.CanvasContext.prototype = new fcInternals.Object();

    fcInternals.CanvasContext.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasContext[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    fcInternals.CanvasContextPrototype = function(globalObject)
    {
        this.initObject(globalObject);

        this.addProperty("__proto__", this.globalObject.fcObjectPrototype);
        this.name = "CanvasContextPrototype";

        fcInternals.CanvasContext.CONST.METHODS.forEach(function(propertyName)
        {
            this.addProperty
            (
                propertyName,
                new fcInternals.fcValue
                (
                    CanvasRenderingContext2D.prototype[propertyName],
                    fcInternals.Function.createInternalNamedFunction(globalObject, propertyName, this),
                    null
                ),
                null,
                false
            );
        }, this);
    };

    fcInternals.CanvasContextPrototype.prototype = new fcInternals.Object();

    fcInternals.CanvasContext.CONST =
    {
        METHODS:
        [
            "arc", "arcTo", "beginPath", "bezierCurveTo", "clearRect", "clip", "closePath", "createImageDate", "createLinearGradient",
            "createPattern", "createRadialGradient", "drawImage", "drawCustomFocusRing", "fill", "fillRect", "fillText", "getImageData",
            "getLineDash", "isPointInPath", "lineTo", "measureText", "moveTo", "putImageData", "quadraticCurveTo", "rect", "restore",
            "rotate", "save", "scale", "scrollPathIntoView", "setLineDash", "setTransform", "stroke", "strokeRect", "strokeText",
            "transform", "translate"
        ]
    }

    fcInternals.CanvasExecutor =
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

                return new fcInternals.fcValue(jsCanvasContext, new fcInternals.CanvasContext(globalObject, jsCanvasContext, thisObjectValue), callExpression);
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
                return new fcInternals.fcValue(result, new fcInternals.LinearGradient(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else if (functionName == "createRadialGradient")
            {
                return new fcInternals.fcValue(result, new fcInternals.CanvasGradient(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else if (functionName == "getImageData")
            {
                return new fcInternals.fcValue(result, new fcInternals.ImageData(globalObject, thisObjectValue, thisObject.iValue.canvas, result), callExpression, null);
            }
            else
            {
                thisObject.iValue.canvas.elementModificationPoints.push({ codeConstruct: callExpression, evaluationPositionId: globalObject.getPreciseEvaluationPositionId()});
                fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

                return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
            }
        }
    };

    fcInternals.LinearGradient = function(globalObject, canvasContext, canvas, linearGradient)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.LinearGradient;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.linearGradient = linearGradient;

        this.addProperty
        (
            "addColorStop", new fcInternals.fcValue(this.linearGradient.addColorStop, fcInternals.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };

    fcInternals.LinearGradient.prototype = new fcInternals.Object();

    fcInternals.LinearGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.linearGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    fcInternals.LinearGradientExecutor =
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
            fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
        }
    };

    fcInternals.CanvasGradient = function(globalObject, canvasContext, canvas, canvasGradient)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.CanvasGradient;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.canvasGradient = canvasGradient;

        this.addProperty
        (
            "addColorStop", new fcInternals.fcValue(this.canvasGradient.addColorStop, fcInternals.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };

    fcInternals.CanvasGradient.prototype = new fcInternals.Object();

    fcInternals.CanvasGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

    fcInternals.CanvasGradientExecutor =
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
            fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(thisObject.iValue.canvas, globalObject, callExpression);

            return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression);
        }
    };

    fcInternals.ImageData = function(globalObject, canvasContext, canvas, imageData)
    {
        this.initObject(globalObject);
        this.constructor = fcInternals.ImageData;

        this.canvasContext = canvasContext;
        this.canvas = canvas;
        this.imageData = imageData;

        this.addProperty("data")

        this.addProperty
        (
            "addColorStop", new fcInternals.fcValue(this.canvasGradient.addColorStop, fcInternals.Function.createInternalNamedFunction(globalObject, "addColorStop", this), null),
            null,
            false
        );
    };

    fcInternals.CanvasGradient.prototype = new fcInternals.Object();

    fcInternals.CanvasGradient.prototype.addJsProperty = function(propertyName, propertyValue, assignmentExpression)
    {
        this.addProperty(propertyName, propertyValue, assignmentExpression);
        this.canvasGradient[propertyName] = propertyValue.jsValue;

        this.canvas.elementModificationPoints.push({ codeConstruct: assignmentExpression, evaluationPositionId: this.globalObject.getPreciseEvaluationPositionId()});
        fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.canvas, this.globalObject, assignmentExpression);
    };

/*************************************************************************************/
})();