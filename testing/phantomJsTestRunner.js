var system = require('system');
var fs = require('fs');
var webPage = require('webpage');
var page = webPage.create();

var currentScriptFile = system.args[0];
var currentDirectory = currentScriptFile.replace(/\w+\.js/, "");

var testsFolder = currentDirectory + "tests" + fs.separator;
var expectedResultsFolder = currentDirectory + "expectedResults" + fs.separator;

fs.list(testsFolder).forEach(function(item)
{
    if(item == "." || item == "..") { return; }

    testFilesInFolder(item);
});

function testFilesInFolder(testFolderName)
{
    fs.list(testsFolder + testFolderName).forEach(function(fileName)
    {
        if(fileName == "." || fileName == "..") { return; }

        testFile(testFolderName, fileName);
    });
}

function testFile(folderName, fileName)
{
    var testFile = testsFolder + folderName + fs.separator + fileName;
    var expectedResultFile = expectedResultsFolder + folderName + fs.separator + fileName;

    console.log(testFile, expectedResultFile);
}

phantom.exit();