port module Ports exposing (loadFromLocalStorage, onLoadFromLocalStorage, saveToLocalStorage)

import Json.Encode as Encode


port saveToLocalStorage : Encode.Value -> Cmd msg


port loadFromLocalStorage : () -> Cmd msg


port onLoadFromLocalStorage : (String -> msg) -> Sub msg
