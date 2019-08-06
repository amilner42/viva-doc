module Page.Documentation exposing (Model, Msg, init, update, view)

import Api.Core as Core
import Bulma
import CodeEditor
import Html exposing (Html, a, aside, dd, div, dl, dt, h1, hr, i, li, p, section, span, text, ul)
import Html.Attributes exposing (class, classList, style)
import Icon
import Language
import Ports
import Route
import Session
import Viewer


type alias Model =
    { documentationTab : Route.DocumentationTab
    , session : Session.Session
    }


init : Session.Session -> Route.DocumentationTab -> ( Model, Cmd Msg )
init session documentationTab =
    ( { documentationTab = documentationTab, session = session }
    , Ports.renderCodeEditors
        [ example1a.renderConfig
        , example1b.renderConfig
        , example1c.renderConfig
        , example1d.renderConfig
        , example1e.renderConfig
        , example1f.renderConfig
        ]
    )


view : Model -> { title : String, content : Html msg }
view model =
    { title =
        case model.documentationTab of
            Route.InstallationTab ->
                "Installation"

            Route.GettingStartedTab ->
                "Getting Started"

            Route.Example1Tab ->
                "Example 1"

            Route.Example2Tab ->
                "Example 2"

            Route.Example3Tab ->
                "Example 3"

            Route.SupportedLanguagesTab ->
                "Supported Languages"

            Route.OverviewTab ->
                "Overview"

            Route.TagsTab ->
                "Tags"

            Route.FileTagTab ->
                "File Tags"

            Route.LineTagTab ->
                "Line Tags"

            Route.BlockTagTab ->
                "Block Tags"

            Route.OwnershipTab ->
                "Ownership"
    , content = renderDocumentation model
    }


renderDocumentation : Model -> Html msg
renderDocumentation ({ session, documentationTab } as model) =
    div
        [ class "columns" ]
        [ div
            [ class "column is-one-quarter" ]
            [ renderSidebar documentationTab ]
        , div
            [ class "column is-three-quarters" ]
            [ section [ class "section" ] [ renderSidebarView model ] ]
        ]


renderSidebar : Route.DocumentationTab -> Html msg
renderSidebar docTab =
    let
        sidebarLink linkText linkToDocTab maybeSubLinks =
            li
                []
                (a
                    [ if docTab == linkToDocTab then
                        class "is-active"

                      else
                        Route.href <| Route.Documentation linkToDocTab
                    ]
                    [ text linkText ]
                    :: (case maybeSubLinks of
                            Nothing ->
                                []

                            Just subLinks ->
                                [ ul [] subLinks ]
                       )
                )
    in
    div [ class "section" ]
        [ aside
            [ class "box menu" ]
            [ p
                [ class "menu-label" ]
                [ text "General" ]
            , ul
                [ class "menu-list" ]
                [ sidebarLink "overview" Route.OverviewTab Nothing
                , sidebarLink "installation" Route.InstallationTab Nothing
                , sidebarLink "getting started" Route.GettingStartedTab <|
                    Just
                        [ sidebarLink "example 1" Route.Example1Tab Nothing
                        , sidebarLink "example 2" Route.Example2Tab Nothing
                        , sidebarLink "example 3" Route.Example3Tab Nothing
                        ]
                , sidebarLink "supported languages" Route.SupportedLanguagesTab Nothing
                ]
            , p
                [ class "menu-label" ]
                [ text "API Reference" ]
            , ul
                [ class "menu-list" ]
                [ sidebarLink "documentation tags" Route.TagsTab <|
                    Just
                        [ sidebarLink "file tag" Route.FileTagTab Nothing
                        , sidebarLink "line tag" Route.LineTagTab Nothing
                        , sidebarLink "block tag" Route.BlockTagTab Nothing
                        ]
                , sidebarLink "ownership" Route.OwnershipTab Nothing
                ]
            ]
        ]


renderSidebarView : Model -> Html msg
renderSidebarView { session, documentationTab } =
    let
        maybeViewer =
            Session.getViewer session
    in
    case documentationTab of
        Route.InstallationTab ->
            renderInstallationTabView maybeViewer

        Route.GettingStartedTab ->
            renderGettingStartedTabView

        Route.Example1Tab ->
            renderExample1TabView

        Route.Example2Tab ->
            renderExample2TabView

        Route.Example3Tab ->
            renderExample3TabView

        Route.SupportedLanguagesTab ->
            renderSupportedLanguagesTabView

        Route.OverviewTab ->
            renderOverviewTabView

        Route.TagsTab ->
            div [] [ text "Page under development..." ]

        Route.FileTagTab ->
            div [] [ text "Page under development..." ]

        Route.LineTagTab ->
            div [] [ text "Page under development..." ]

        Route.BlockTagTab ->
            div [] [ text "Page under development..." ]

        Route.OwnershipTab ->
            div [] [ text "Page under development..." ]


type InstallationStage
    = NotSignedUp
    | SignedUpWithNoRepos
    | SignedUpWithRepos


renderInstallationTabView : Maybe Viewer.Viewer -> Html msg
renderInstallationTabView maybeViewer =
    let
        installationStage =
            case maybeViewer of
                Nothing ->
                    NotSignedUp

                Just viewer ->
                    if
                        Viewer.getRepos viewer
                            |> List.any Core.getRepoAppInstalledStatus
                    then
                        SignedUpWithRepos

                    else
                        SignedUpWithNoRepos

        notSignedUpDt =
            dt
                []
                [ Icon.renderIcon
                    { iconName = "check_box_outline_blank"
                    , optionalAdjacentText = Just ( "Sign up with your github account", Bulma.DarkGrey )
                    , iconSize = Bulma.BulmaSmall
                    , iconColor = Bulma.DarkGrey
                    }
                , dd
                    [ class "content"
                    , style "padding" "10px 25px 25px 25px"
                    ]
                    [ Icon.renderIcon
                        { iconName = "text_information"
                        , optionalAdjacentText =
                            Just
                                ( "Click the sign in button in the top right corner of the navbar."
                                , Bulma.DarkGrey
                                )
                        , iconSize = Bulma.BulmaSmall
                        , iconColor = Bulma.DarkGrey
                        }
                    ]
                ]

        signedUpDt =
            dt
                [ style "margin-bottom" "10px" ]
                [ Icon.renderIcon
                    { iconName = "check_box"
                    , optionalAdjacentText = Just ( "Sign up with your github account", Bulma.LightGrey )
                    , iconSize = Bulma.BulmaSmall
                    , iconColor = Bulma.Success
                    }
                ]

        notInstalledOnRepoDt showExplanation =
            dt
                []
                [ Icon.renderIcon
                    { iconName = "check_box_outline_blank"
                    , optionalAdjacentText =
                        Just
                            ( "Install the app on some of your repos"
                            , if showExplanation then
                                Bulma.DarkGrey

                              else
                                Bulma.LightGrey
                            )
                    , iconSize = Bulma.BulmaSmall
                    , iconColor =
                        if showExplanation then
                            Bulma.DarkGrey

                        else
                            Bulma.LightGrey
                    }
                , dd
                    [ classList
                        [ ( "content", True )
                        , ( "is-hidden", not showExplanation )
                        ]
                    , style "padding" "10px 25px"
                    ]
                    [ Icon.renderIcon
                        { iconName = "text_information"
                        , optionalAdjacentText =
                            Just
                                ( "Go to the home page to install the app on a repository"
                                , Bulma.DarkGrey
                                )
                        , iconSize = Bulma.BulmaSmall
                        , iconColor = Bulma.DarkGrey
                        }
                    ]
                ]

        installedOnRepoDt =
            dt
                []
                [ Icon.renderIcon
                    { iconName = "check_box"
                    , optionalAdjacentText = Just ( "Install the app on some of your repos", Bulma.LightGrey )
                    , iconSize = Bulma.BulmaSmall
                    , iconColor = Bulma.Success
                    }
                ]
    in
    div
        [ class "content" ]
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light"
            ]
            [ text "Installation" ]
        , div
            [ class "content" ]
            [ text "Adding VivaDoc to any GitHub project only takes a few clicks and works completely out of the box." ]
        , dl [ style "padding-left" "20px" ] <|
            case installationStage of
                NotSignedUp ->
                    [ notSignedUpDt
                    , notInstalledOnRepoDt False
                    ]

                SignedUpWithNoRepos ->
                    [ signedUpDt
                    , notInstalledOnRepoDt True
                    ]

                SignedUpWithRepos ->
                    [ signedUpDt
                    , installedOnRepoDt
                    ]
        ]


renderOverviewTabView : Html msg
renderOverviewTabView =
    div
        [ class "content" ]
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Overview" ]
        , span
            [ class "vd-regular-text" ]
            [ text """Conceptually, VivaDoc is built on the """
            , span [ class "has-text-weight-bold" ] [ text """Directly Responsible Individual""" ]
            , text """ principle created and
              currently used at Apple. The principle is rather intuitive, projects will be more successful if each
              component always has someone directly responsible. This model helps keep team members proactive and never
              assuming"""
            , span [ class "has-text-weight-semibold" ] [ text " someone else will handle it." ]
            ]
        , p
            [ class "vd-regular-text", style "margin-top" "30px" ]
            [ text """It has become so common-place in the industry for technical documentation to become outdated
              that it comes as no surprise to developers when half their day is spent mangling a piece of code only to
              find out the documentation for the library they were using was entirely outdated."""
            ]
        , p
            [ class "vd-regular-text", style "margin-top" "30px" ]
            [ text """Enter VivaDoc to establish the new status quo. With VivaDoc, members of your team become directly
              responsible for the documentation of components they manage. Whether it is external documentation for a
              public API or internal
              documentation for a critical library, VivaDoc will make sure that nothing slips by unnoticed.
              Best of all, VivaDoc works entirely out of the box and can be installed in just a few clicks. It can be
              gradually added to any large project so there is no barrier-to-entry. In just a"""
            , span [ class "has-text-weight-semibold" ] [ text " few minutes " ]
            , text """you can assign
              responsibility to the most critical documentation and save your team and your customers countless hours
              of frustration."""
            ]
        , p
            [ class "vd-regular-text", style "margin-top" "30px" ]
            [ text """It is time for all of us as a community to value each other's time and start shipping
              high-quality documentation."""
            ]
        ]


renderGettingStartedTabView : Html msg
renderGettingStartedTabView =
    div [ class "content" ] <|
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Getting Started" ]
        , p
            [ class "vd-regular-text" ]
            [ text "Once you have installed VivaDoc on a repository, it will automatically monitor all"
            , span [ class "has-text-weight-semibold" ] [ text " documentation tags " ]
            , text """ on all open pull requests. It does this by analyzing the HEAD commit of every
            pull request. Any time code is pushed to a pull request, VivaDoc will analyze the new HEAD commit.
            VivaDoc wants to ensure that any code merged in a pull request will not outdate any documentation
            being monitored. All critical documentation should therefore be monitored with VivaDoc."""
            ]
        , p
            []
            [ text """If any documentation tags have been modified and have not been approved by their owners, VivaDoc
            will assign a failure status to that commit. Once all documentation tags have been reviewed and approved,
            VivaDoc will assign a success status to that commit. This behaves similar to continuous integration,
            but instead of monitoring tests passing, we monitor documentation quality. At VivaDoc we call this """
            , span [ class "has-text-weight-semibold" ] [ text "continuous documentation." ]
            ]
        , p
            []
            [ text """To review documentation tags, simply click the link given on Github on the commit status. It will
            direct you to the documentation review page within the VivaDoc app. There you will be able to review all
            documentation tags that belong to you that have been modified as well as view what documentation tags
            are awaiting review from the rest of your team.""" ]
        , p
            []
            [ text """Similar to continuous integration, it is up to the owner of the repository to decide whether a
            pull request can be merged if the continuous documentation has a failing status. While it is optional,
            it is highly recommended to require a VivaDoc success status to merge a pull request with a production
            branch - fixing broken documentation is not nearly as time consuming or frustrating as stumbling into broken
            documentation unknowingly."""
            ]
        ]


type alias RenderCodeEditorColumnsConfig =
    { renderConfig : Ports.RenderCodeEditorConfig
    , textAboveEditor : String
    , editorSubText : String
    , editorHeight : Int
    }


toPixels : Int -> String
toPixels pixels =
    String.fromInt pixels ++ "px"


renderCodeEditorColumns : RenderCodeEditorColumnsConfig -> Html msg
renderCodeEditorColumns { renderConfig, textAboveEditor, editorSubText, editorHeight } =
    div
        []
        [ p [ style "max-width" "700px", style "margin-bottom" "20px" ] [ text textAboveEditor ]
        , div
            [ class "has-code-editor", style "height" <| toPixels editorHeight, style "max-width" "700px" ]
            [ CodeEditor.codeEditor renderConfig.tagId ]
        , div [ class "has-text-grey-light", style "margin-bottom" "40px" ] [ text editorSubText ]
        ]


renderExample1TabView : Html msg
renderExample1TabView =
    div [ class "content" ] <|
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Example 1" ]
        , renderCodeEditorColumns example1a
        , renderCodeEditorColumns example1b
        , renderCodeEditorColumns example1c
        , renderCodeEditorColumns example1d
        , renderCodeEditorColumns example1e
        , renderCodeEditorColumns example1f
        , p
            []
            [ text "This was a fictional example to showcase how simple it is to use VivaDoc." ]
        ]


example1a : RenderCodeEditorColumnsConfig
example1a =
    { renderConfig =
        { tagId = "example-1"
        , startLineNumber = 200
        , customLineNumbers = Nothing
        , redLineRanges = []
        , greenLineRanges = []
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , " ..."
            , "}"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = "Let us take a look at a single function in an imaginary public booking service API."
    , editorSubText = "The code for the function is omitted."
    , editorHeight = 100
    }


example1b : RenderCodeEditorColumnsConfig
example1b =
    { renderConfig =
        { tagId = "example-1b"
        , startLineNumber = 200
        , customLineNumbers = Nothing
        , redLineRanges = []
        , greenLineRanges = [ ( 202, 202 ), ( 206, 206 ) ]
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "// @VD amilner42 block"
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , " ..."
            , "}"
            , "// @VD end-block"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = """If I wanted to assign myself, amilner42, to be directly responsible for this documentation
    all I have to do is add a documentation tag.
    In this case I used a block tag to capture the block of code representing the function. Block tags will likely be
    the most common type of documentation tag that you use as they can wrap any chunk of code."""
    , editorSubText = "Diff highlighted in green."
    , editorHeight = 130
    }


example1c : RenderCodeEditorColumnsConfig
example1c =
    { renderConfig =
        { tagId = "example-1c"
        , startLineNumber = 200
        , customLineNumbers = Nothing
        , redLineRanges = []
        , greenLineRanges = [ ( 202, 202 ), ( 206, 206 ) ]
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "// @VD amilner42,bderayat block"
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , " ..."
            , "}"
            , "// @VD end-block"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = """It may be the case though that you don't want to be the only one directly responsible. If
    you would like to require approval from multiple users you simply list all users seperated by commas. In the
    following case, the tag will require approval from both amilner42 and bderayat."""
    , editorSubText = "Diff highlighted in green."
    , editorHeight = 130
    }


example1d : RenderCodeEditorColumnsConfig
example1d =
    { renderConfig =
        { tagId = "example-1d"
        , startLineNumber = 200
        , customLineNumbers = Nothing
        , redLineRanges = []
        , greenLineRanges = [ ( 202, 202 ), ( 206, 206 ) ]
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "// @VD amilner42|bderayat block"
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , " ..."
            , "}"
            , "// @VD end-block"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = """Had I instead wanted to require approval from either of us, I simply would
    use the following syntax. You can use as many commas and pipes as you need."""
    , editorSubText = "Diff highlighted in green."
    , editorHeight = 130
    }


example1e : RenderCodeEditorColumnsConfig
example1e =
    { renderConfig =
        { tagId = "example-1e"
        , startLineNumber = 200
        , customLineNumbers = Nothing
        , redLineRanges = []
        , greenLineRanges = [ ( 204, 206 ) ]
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "// @VD amilner42 block"
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , "  if (isDoubleBooked(locationId, timeslot)) {"
            , "    throw new BookingError(...);"
            , "  }"
            , "  ..."
            , "}"
            , "// @VD end-block"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = """Let us now imagine someone changes the code but does not update the documentation to reflect
    this new change."""
    , editorSubText = "Diff highlighted in green."
    , editorHeight = 175
    }


example1f : RenderCodeEditorColumnsConfig
example1f =
    { renderConfig =
        { tagId = "example-1f"
        , startLineNumber = 200
        , customLineNumbers = Just [ Just 200, Nothing, Just 201, Just 202, Just 203, Just 204, Just 205, Just 206, Just 207, Just 208 ]
        , redLineRanges = [ ( 201, 201 ) ]
        , greenLineRanges = []
        , content =
            [ "// Place a booking for a given time slot."
            , "// NOTE: Double-booking is permitted."
            , "// @VD amilner42 block"
            , "const bookTimeslot = (locationId: String, timeslot: Timeslot) => { "
            , "  if (isDoubleBooked(locationId, timeslot)) {"
            , "    throw new BookingError(...);"
            , "  }"
            , "  ..."
            , "}"
            , "// @VD end-block"
            ]
        , language = Language.toString Language.Typescript
        }
    , textAboveEditor = """Luckily VivaDoc would require my review, and upon VivaDoc showing me the diff and the docs
    it would be rather obvious that the documentation has not been upated properly. I can commit a simple fix preventing
    these docs from frustrating the users consuming our API.
    """
    , editorSubText = "Diff highlighted in red."
    , editorHeight = 175
    }


renderExample2TabView : Html msg
renderExample2TabView =
    div [ class "content" ] <|
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Example 2" ]
        ]


renderExample3TabView : Html msg
renderExample3TabView =
    div [ class "content" ] <|
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Example 3" ]
        ]


renderSupportedLanguagesTabView : Html msg
renderSupportedLanguagesTabView =
    div [ class "content" ] <|
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Supported Languages" ]
        , p
            []
            [ text "VivaDoc is in its early stages and is only able to support the following langauges" ]
        , dl
            [ class "has-text-weight-semibold", style "padding-left" "30px" ]
            [ dt [] [ text "C" ]
            , dt [] [ text "C++" ]
            , dt [] [ text "Javascript" ]
            , dt [] [ text "Java" ]
            , dt [] [ text "Typescript" ]
            ]
        , p [] [ text "More languages will be supported as VivaDoc continues to grow." ]
        , p
            []
            [ text """In the meantime, if your repository uses any of the languages listed above you can immedietely get
            started using VivaDoc for files written in those languages. All files in languages that VivaDoc does not
            support will simply be ignored - they will not cause errors."""
            ]
        ]


type Msg
    = NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
