module Page.Documentation exposing (Model, Msg, init, update, view)

import Api.Core as Core
import Bulma
import Html exposing (Html, a, aside, dd, div, dl, dt, h1, i, li, p, section, span, text, ul)
import Html.Attributes exposing (class, classList, style)
import Icon
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
    , Cmd.none
    )


view : Model -> { title : String, content : Html msg }
view model =
    { title = "Getting Started"
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
                [ text "Getting Started" ]
            , ul
                [ class "menu-list" ]
                [ sidebarLink "installation" Route.InstallationTab Nothing
                , sidebarLink "basics" Route.BasicsTab Nothing
                ]
            , p
                [ class "menu-label" ]
                [ text "API Reference" ]
            , ul
                [ class "menu-list" ]
                [ sidebarLink "overview" Route.OverviewTab Nothing
                , sidebarLink "tags" Route.TagsTab <|
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

        Route.BasicsTab ->
            renderBasicsTabView

        Route.OverviewTab ->
            div [] [ text "Page under development..." ]

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


renderBasicsTabView : Html msg
renderBasicsTabView =
    div
        [ class "content" ]
        [ h1
            [ class "title is-2 has-text-vd-base-dark has-text-weight-light" ]
            [ text "Basics" ]
        , p
            [ class "vd-regular-text" ]
            [ text vdOverviewText ]
        ]


vdOverviewText : String
vdOverviewText =
    """TODO"""


type Msg
    = NoOp


update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
    case msg of
        NoOp ->
            ( model, Cmd.none )
