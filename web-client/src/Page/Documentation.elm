module Page.Documentation exposing (view)

import Html exposing (Html, text)


view : { title : String, content : Html msg }
view =
    { title = "Docs"
    , content = text "TODO"
    }
