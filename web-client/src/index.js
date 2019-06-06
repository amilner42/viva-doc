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
