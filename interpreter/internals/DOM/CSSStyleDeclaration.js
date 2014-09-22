(function()
{
    var fcInternals = Firecrow.Interpreter.Internals;
    var ValueTypeHelper = Firecrow.ValueTypeHelper;

    fcInternals.CSSStyleDeclaration = function(htmlElement, cssStyleDeclaration, globalObject, codeConstruct)
    {
        try
        {
            this.initObject(globalObject, codeConstruct);

            this.htmlElement = htmlElement;
            this.cssStyleDeclaration = cssStyleDeclaration || this.htmlElement.style;

            this.constructor = fcInternals.CSSStyleDeclaration;

            var methodObject = this.cssStyleDeclaration || CSSStyleDeclaration.prototype;

            var methods = fcInternals.CSSStyleDeclaration.CONST.INTERNAL_PROPERTIES.METHODS;

            for(var i = 0, length = methods.length; i < length; i++)
            {
                var method = methods[i];

                this.addProperty
                (
                    method,
                    new fcInternals.fcValue
                    (
                        methodObject[method],
                        fcInternals.Function.createInternalNamedFunction(globalObject, method, this),
                        codeConstruct
                    ),
                    codeConstruct,
                    false
                );
            }

            this.getJsPropertyValue = function(propertyName, codeConstruct)
            {
                if(ValueTypeHelper.isPrimitive(this.cssStyleDeclaration[propertyName]))
                {
                    return this.globalObject.internalExecutor.createInternalPrimitiveObject(codeConstruct, this.cssStyleDeclaration[propertyName])
                }

                if(propertyName =="top" || propertyName == "left")
                {
                    console.log(codeConstruct.loc.start.line + " - " + propertyName + this.getPropertyValue(propertyName, codeConstruct).jsValue)
                }

                return this.getPropertyValue(propertyName, codeConstruct);
            };

            this.addJsProperty = function(propertyName, value, codeConstruct)
            {
                this.cssStyleDeclaration[propertyName] = value.jsValue;
                this.addProperty(propertyName, value, codeConstruct);

                this.globalObject.dependencyCreator.createDataDependency(this.htmlElement.modelElement, codeConstruct, this.globalObject.getPreciseEvaluationPositionId());
                fcInternals.HtmlElementExecutor.addDependencyIfImportantElement(this.htmlElement, this.globalObject, codeConstruct);
            };
        }
        catch(e)
        {
            fcInternals.CSSStyleDeclaration.notifyError("Error when creating CSSStyleDeclaration " + e);
        }
    };

    fcInternals.CSSStyleDeclaration.prototype = new fcInternals.Object();

    fcInternals.CSSStyleDeclaration.createStyleDeclaration = function(htmlElement, cssStyleDeclaration, globalObject, codeConstruct)
    {
        return new fcInternals.fcValue
        (
            cssStyleDeclaration,
            new fcInternals.CSSStyleDeclaration(htmlElement, cssStyleDeclaration, globalObject, codeConstruct),
            codeConstruct
        );
    };

    fcInternals.CSSStyleDeclaration.notifyError =  function (message){debugger; alert("CSSStyleDeclaration - " + message); }

    fcInternals.CSSStyleDeclarationExecutor =
    {
        executeInternalMethod: function(thisObject, functionObject, args, callExpression)
        {
            if(!functionObject.isInternalFunction) { fcInternals.CSSStyleDeclaration.notifyError("The function should be internal when css declaration method!"); return; }

            var functionObjectValue = functionObject.jsValue;
            var thisObjectValue = thisObject.jsValue;
            var functionName = functionObjectValue.name;
            var fcThisValue =  thisObject.iValue;
            var globalObject = fcThisValue.globalObject;
            var jsArguments =  globalObject.getJsValues(args);

            switch(functionName)
            {
                case "getPropertyPriority":
                case "getPropertyValue":
                case "item":
                    var result = thisObjectValue[functionName].apply(thisObjectValue, jsArguments);
                    return globalObject.internalExecutor.createInternalPrimitiveObject(callExpression, result);
                case "removeProperty":
                case "setProperty":
                default:
                    fcInternals.CSSStyleDeclaration.notifyError("Unhandled internal method in cssStyleDeclaration:" + functionName);
                    return;
            }
        }
    };

    fcInternals.CSSStyleDeclaration.CONST =
    {
        INTERNAL_PROPERTIES :
        {
            METHODS:
            [
                "getPropertyPriority", "getPropertyValue", "item", "removeProperty",
                "setProperty"
            ],
            PROPERTIES:
            [
                "cssText", "length", "parentRule",
                "background", "backgroundAttachment", "backgroundColor", "backgroundImage", "backgroundPosition","backgroundRepeat",
                "border","borderCollapse","borderColor","borderSpacing","borderStyle","borderTop","borderRight","borderBottom",
                "borderLeft","borderTopColor","borderRightColor","borderBottomColor","borderLeftColor","borderTopStyle","borderRightStyle",
                "borderBottomStyle","borderLeftStyle","borderTopWidth","borderRightWidth","borderBottomWidth","borderLeftWidth","borderWidth",
                "borderRadius","borderTopLeftRadius","borderTopRightRadius","borderBottomLeftRadius","borderBottomRightRadius","bottom",
                "boxShadow","captionSide","clear","clip","color","content","counterIncrement","counterReset","cursor",
                "direction","display","emptyCells","cssFloat","font","fontFamily","fontSize","fontSizeAdjust","fontStretch",
                "fontStyle","fontVariant","fontWeight","height","left","letterSpacing","lineHeight","listStyle","listStyleImage",
                "listStylePosition","listStyleType","margin","marginTop","marginRight","marginBottom","marginLeft","markerOffset",
                "marks","maxHeight","maxWidth","minHeight","minWidth","orphans","outline","outlineColor","outlineStyle","outlineWidth",
                "overflow","padding","paddingTop","paddingRight","paddingBottom","paddingLeft","page","pageBreakAfter","pageBreakBefore",
                "pageBreakInside","position","quotes","right","size","tableLayout","textAlign","textDecoration","textIndent","textOverflow",
                "textShadow","textTransform","top","unicodeBidi","verticalAlign","visibility","whiteSpace","widows","width","wordSpacing",
                "zIndex","clipPath","clipRule","colorInterpolation","colorInterpolationFilters","dominantBaseline","fill","fillOpacity",
                "fillRule","filter","floodColor","floodOpacity","imageRendering","lightingColor","marker","markerEnd","markerMid",
                "markerStart","mask","shapeRendering","stopColor","stopOpacity","stroke","strokeDasharray",
                "strokeDashoffset","strokeLinecap","strokeLinejoin","strokeMiterlimit","strokeOpacity","strokeWidth",
                "textAnchor","textRendering", "backgroundOrigin"
            ]
        }
    };
})();