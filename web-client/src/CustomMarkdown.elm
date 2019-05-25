module CustomMarkdown exposing (RenderStyle(..), getMarkdown)

{-| Module for handling rendering markdown.
-}

import BranchReview
import Html exposing (div)
import Html.Attributes exposing (class, style)
import Markdown


type RenderStyle
    = GreenBackground
    | RedBackground
    | PlainBackground
    | MixedBackground { alteredLines : List BranchReview.AlteredLine, showAlteredLines : Bool }


{-| Get the markdown for some content.

Will display the diff if set in the `RenderStyle`. Will do so by returning multiple markdown blocks which should be
displayed back-2-back vertically to look like a single markdown block.

TODO test (mostly diff rendering could use testing)

-}
getMarkdown :
    List String
    -> Int
    -> String
    -> RenderStyle
    -> List (Html.Html msg)
getMarkdown content startLineNumber language renderStyle =
    case renderStyle of
        GreenBackground ->
            [ markdownToHtml
                [ class "is-child green-markdown-background" ]
                (contentToMarkdownCode language content Plus)
            ]

        RedBackground ->
            [ markdownToHtml
                [ class "is-child red-markdown-background" ]
                (contentToMarkdownCode language content Minus)
            ]

        PlainBackground ->
            [ markdownToHtml
                [ class "is-child" ]
                (contentToMarkdownCode language content None)
            ]

        MixedBackground { alteredLines, showAlteredLines } ->
            if not showAlteredLines then
                [ markdownToHtml
                    [ class "is-child" ]
                    (contentToMarkdownCode language content None)
                ]

            else
                getMarkdownBlocksForAlteredLines content startLineNumber language alteredLines


getMarkdownBlocksForAlteredLines :
    List String
    -> Int
    -> String
    -> List BranchReview.AlteredLine
    -> List (Html.Html msg)
getMarkdownBlocksForAlteredLines content startLineNumber language alteredLines =
    let
        -- Add diffAcc to final result
        addDiffAccToFinalResult :
            DiffAccumulator
            -> List { cssClass : String, content : String }
            -> List { cssClass : String, content : String }
        addDiffAccToFinalResult diffAcc finalResult =
            case diffAcc of
                Blank ->
                    finalResult

                Green greenContent ->
                    { cssClass = "is-child green-markdown-background"
                    , content = contentToMarkdownCode language greenContent Plus
                    }
                        :: finalResult

                Red redContent ->
                    { cssClass = "is-child red-markdown-background"
                    , content = contentToMarkdownCode language redContent Minus
                    }
                        :: finalResult

                Neutral neutralContent ->
                    { cssClass = "is-child"
                    , content = contentToMarkdownCode language neutralContent None
                    }
                        :: finalResult

        -- Get markdown blocks in reverse order (faster to append + reverse)
        go :
            List String
            -> Int
            -> List BranchReview.AlteredLine
            -> DiffAccumulator
            -> List { cssClass : String, content : String }
            -> List { cssClass : String, content : String }
        go remainingContent currentLineNumber remainingAlteredLines diffAcc finalResult =
            case ( remainingContent, remainingAlteredLines ) of
                -- Base Case
                ( [], [] ) ->
                    addDiffAccToFinalResult diffAcc finalResult

                -- Only content lines remaining
                ( _ :: _, [] ) ->
                    { cssClass = "is-child"
                    , content = contentToMarkdownCode language remainingContent None
                    }
                        :: addDiffAccToFinalResult diffAcc finalResult

                -- Only altered lines remaining
                ( [], firstRemainingAlteredLine :: restOfRemainingAlteredLines ) ->
                    case ( firstRemainingAlteredLine.editType, diffAcc ) of
                        ( BranchReview.Insertion, Green greenContent ) ->
                            go
                                []
                                (currentLineNumber + 1)
                                restOfRemainingAlteredLines
                                (Green <| greenContent ++ [ firstRemainingAlteredLine.content ])
                                finalResult

                        ( BranchReview.Insertion, _ ) ->
                            go
                                []
                                (currentLineNumber + 1)
                                restOfRemainingAlteredLines
                                (Green [ firstRemainingAlteredLine.content ])
                                (addDiffAccToFinalResult diffAcc finalResult)

                        ( BranchReview.Deletion, Red redContent ) ->
                            go
                                []
                                currentLineNumber
                                restOfRemainingAlteredLines
                                (Red <| redContent ++ [ firstRemainingAlteredLine.content ])
                                finalResult

                        ( BranchReview.Deletion, _ ) ->
                            go
                                []
                                currentLineNumber
                                restOfRemainingAlteredLines
                                (Red <| [ firstRemainingAlteredLine.content ])
                                (addDiffAccToFinalResult diffAcc finalResult)

                -- Both altered lines and content remain
                ( firstContentLine :: restOfRemainingContent, firstRemainingAlteredLine :: restOfRemainingAlteredLines ) ->
                    if firstRemainingAlteredLine.currentLineNumber == currentLineNumber then
                        case firstRemainingAlteredLine.editType of
                            BranchReview.Deletion ->
                                case diffAcc of
                                    Red redContent ->
                                        go
                                            remainingContent
                                            currentLineNumber
                                            restOfRemainingAlteredLines
                                            (Red <| redContent ++ [ firstRemainingAlteredLine.content ])
                                            finalResult

                                    _ ->
                                        go
                                            remainingContent
                                            currentLineNumber
                                            restOfRemainingAlteredLines
                                            (Red <| [ firstRemainingAlteredLine.content ])
                                            (addDiffAccToFinalResult diffAcc finalResult)

                            BranchReview.Insertion ->
                                case diffAcc of
                                    Green greenContent ->
                                        go
                                            restOfRemainingContent
                                            (currentLineNumber + 1)
                                            restOfRemainingAlteredLines
                                            (Green <| greenContent ++ [ firstRemainingAlteredLine.content ])
                                            finalResult

                                    _ ->
                                        go
                                            restOfRemainingContent
                                            (currentLineNumber + 1)
                                            restOfRemainingAlteredLines
                                            (Green <| [ firstRemainingAlteredLine.content ])
                                            (addDiffAccToFinalResult diffAcc finalResult)

                    else
                        case diffAcc of
                            Neutral neutralContent ->
                                go
                                    restOfRemainingContent
                                    (currentLineNumber + 1)
                                    remainingAlteredLines
                                    (Neutral <| neutralContent ++ [ firstContentLine ])
                                    finalResult

                            _ ->
                                go
                                    restOfRemainingContent
                                    (currentLineNumber + 1)
                                    remainingAlteredLines
                                    (Neutral <| [ firstContentLine ])
                                    (addDiffAccToFinalResult diffAcc finalResult)
    in
    go content startLineNumber alteredLines Blank []
        |> List.reverse
        |> (\listOfRenderConfig ->
                case listOfRenderConfig of
                    [] ->
                        [ div [ class "is-hidden" ] [] ]

                    [ singleBlock ] ->
                        [ markdownToHtml
                            [ class singleBlock.cssClass ]
                            singleBlock.content
                        ]

                    multipleBlocks ->
                        let
                            numberOfBlocks =
                                List.length multipleBlocks
                        in
                        List.indexedMap
                            (\index renderConfig ->
                                if index == 0 then
                                    markdownToHtml
                                        [ class <| renderConfig.cssClass ++ " first-code-block" ]
                                        renderConfig.content

                                else if index == numberOfBlocks - 1 then
                                    markdownToHtml
                                        [ class <| renderConfig.cssClass ++ " last-code-block" ]
                                        renderConfig.content

                                else
                                    markdownToHtml
                                        [ class <| renderConfig.cssClass ++ " middle-code-block" ]
                                        renderConfig.content
                            )
                            multipleBlocks
           )


markdownToHtml : List (Html.Attribute msg) -> String.String -> Html.Html msg
markdownToHtml =
    Markdown.toHtmlWith
        { githubFlavored = Just { tables = False, breaks = True }
        , defaultHighlighting = Nothing
        , sanitize = True
        , smartypants = False
        }


contentToMarkdownCode : String -> List String -> LinePrefix -> String
contentToMarkdownCode language content linePrefix =
    let
        contentWithPrefix =
            let
                prefix =
                    case linePrefix of
                        None ->
                            Char.fromCode 0x200E |> String.fromChar |> (\charPrefix -> charPrefix ++ "  ")

                        Plus ->
                            "+ "

                        Minus ->
                            "- "
            in
            List.map (\lineContent -> prefix ++ lineContent) content
    in
    "```" ++ language ++ "\n" ++ String.join "\n" contentWithPrefix ++ "\n```"


type DiffAccumulator
    = Blank
    | Green (List String)
    | Red (List String)
    | Neutral (List String)


type LinePrefix
    = None
    | Plus
    | Minus
