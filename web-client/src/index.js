'use strict';

require("./styles/styles.scss");

const {Elm} = require('./Main');
var app = Elm.Main.init({flags: null});

const VD_LOCAL_STORAGE_KEY = "vd_persist"

// Saves the model to local storage.
app.ports.saveToLocalStorage.subscribe(function(model) {
  localStorage.setItem(VD_LOCAL_STORAGE_KEY, JSON.stringify(model));
});

// Load the model from localStorage and send message to subscription over
// port.
app.ports.loadFromLocalStorage.subscribe(function() {
  app.ports.onLoadFromLocalStorage.send(localStorage.getItem(VD_LOCAL_STORAGE_KEY) || "")
});

const Range = ace.require('ace/range').Range;

const shiftRange = (startLineNumber, [rangeStartLine, rangeEndLine]) => {
  return [ rangeStartLine - startLineNumber, rangeEndLine - startLineNumber ];
}

const editors = { }

const renderCodeEditor = (renderConfig) => {

  // Already had an editor, delete then re-render.

  if (editors[renderConfig.tagId]) {
    const replacementDiv = document.createElement("pre");
    replacementDiv.setAttribute("id", `editor-${renderConfig.tagId}`);
    const editor = editors[renderConfig.tagId];
    editor.destroy();
    editor.container.parentNode.replaceChild(replacementDiv, editor.container);
  }

  // First time making this editor.

  window.requestAnimationFrame(() => {
    const editor = ace.edit(`editor-${renderConfig.tagId}`);
    editors[renderConfig.tagId] = editor;

    editor.setReadOnly(true);
    editor.setTheme("ace/theme/github");
    editor.session.setMode("ace/mode/typescript");
    editor.setHighlightActiveLine(false);

    editor.setOption("firstLineNumber", renderConfig.startLineNumber)
    if (!renderConfig.showLineNumbers) {
      editor.setOption('showLineNumbers', false);
    }

    editor.setValue(renderConfig.content.join("\n"), -1);

    for (let greenRange of renderConfig.greenLineRanges) {
      const [ startLine, endLine ] = shiftRange(renderConfig.startLineNumber, greenRange);
      editor.session.addMarker(new Range(startLine, 0, endLine, 1), "green-line", "fullLine")
    }

    for (let redRange of renderConfig.redLineRanges) {
      const [ startLine, endLine ] = shiftRange(renderConfig.startLineNumber, redRange);
      editor.session.addMarker(new Range(startLine, 0, endLine, 1), "red-line", "fullLine")
    }

  })


}

app.ports.renderCodeEditors.subscribe(function(renderConfigs) {

  window.requestAnimationFrame(() => {
    renderConfigs.map(renderCodeEditor);
  });

})

app.ports.rerenderCodeEditor.subscribe(function(renderConfig) {
  renderCodeEditor(renderConfig);
})
