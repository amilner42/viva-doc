module Language exposing (Language(..), decodeLanguage, toString)

import Json.Decode as Decode


type Language
    = Javascript
    | Typescript
    | Java
    | C
    | CPlusPlus
    | Header


toString : Language -> String
toString language =
    case language of
        Javascript ->
            "Javascript"

        Typescript ->
            "Typescript"

        Java ->
            "Java"

        C ->
            "C"

        CPlusPlus ->
            "CPlusPlus"

        Header ->
            "Header"


decodeLanguage : Decode.Decoder Language
decodeLanguage =
    Decode.string
        |> Decode.andThen
            (\strLang ->
                case strLang of
                    "Javascript" ->
                        Decode.succeed Javascript

                    "Typescript" ->
                        Decode.succeed Typescript

                    "Java" ->
                        Decode.succeed Java

                    "C" ->
                        Decode.succeed C

                    "CPlusPlus" ->
                        Decode.succeed CPlusPlus

                    "Header" ->
                        Decode.succeed Header

                    _ ->
                        Decode.fail <| "Unsupported language: " ++ strLang
            )
