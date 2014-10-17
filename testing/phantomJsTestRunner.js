var system = require('system');
var fs = require('fs');
var webPage = require('webpage');
var page = webPage.create();

page.onError = function(msg, trace)
{
    var msgStack = ['ERROR: ' + msg];

    if (trace && trace.length) {
        msgStack.push('TRACE:');
        trace.forEach(function(t) {
            msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
        });
    }

    console.error(msgStack.join('\n'));
};

page.onConsoleMessage = function(msg)
{
    console.log('CONSOLE: ' + msg);
};

var currentScriptFile = system.args[0];
var currentDirectory = currentScriptFile.replace(/\w+\.js/, "");

var testsFolder = currentDirectory + "tests" + fs.separator;
var expectedResultsFolder = currentDirectory + "expectedResults" + fs.separator;
var phantomJsTestEnvironmentPage = "http://localhost/jFirecrow/testing/phantomJsTestEnvironment.html";

var testFiles = [];

fs.list(testsFolder).forEach(function(item)
{
    if(item == "." || item == "..") { return; }

    traverseTestFilesInFolder(item);
});

function traverseTestFilesInFolder(testFolderName)
{
    fs.list(testsFolder + testFolderName).forEach(function(fileName)
    {
        if(fileName == "." || fileName == "..") { return; }

        testFiles.push
        ({
            testFile: testsFolder + testFolderName + fs.separator + fileName,
            expectedResultFile: expectedResultsFolder + testFolderName + fs.separator + fileName
        });
    });
}

function processNextTest()
{
    if(testFiles.length == 0) { phantom.exit(); }

    var test = testFiles.pop();

    page.open(phantomJsTestEnvironmentPage, function(status)
    {
        if(status != "success") { console.error(status, test.testFile); }

        var scriptCode = fs.read(test.testFile);

        var resultCode = page.evaluate(function(scriptCode)
        {
            document.getElementById("originalSourceElement").value = scriptCode;
            document.getElementById("sliceButton").onclick();

            return document.getElementById("resultSourceElement").value;
        }, scriptCode);

        var expectedCode = fs.read(test.expectedResultFile);

        if(resultCode.replace(/\s+/g, " ") != expectedCode.replace(/\s+/g, " "))
        {
            //console.error("TEST ERROR:", test.testFile);
            console.error("TEST ERROR:", test.testFile, "\nExpected: ", expectedCode, "\n\nGot:", resultCode);
        }
        else
        {
            console.log("TEST SUCCESS: ", test.testFile, "successful");
        }
    });
}

processNextTest();