module Page.Documentation exposing (view)

import Api.Core as Core
import Bulma
import Html exposing (Html, dd, div, dl, dt, h1, i, p, section, span, text)
import Html.Attributes exposing (class, classList, style)
import Icon
import Viewer


view : Maybe Viewer.Viewer -> { title : String, content : Html msg }
view viewer =
    { title = "Getting Started"
    , content = renderDocumentation viewer
    }


renderDocumentation : Maybe Viewer.Viewer -> Html msg
renderDocumentation maybeViewer =
    div
        [ class "container" ]
        [ renderInstallSection <|
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
        , renderBasicUsageSection
        ]


type InstallationStage
    = NotSignedUp
    | SignedUpWithNoRepos
    | SignedUpWithRepos


renderInstallSection : InstallationStage -> Html msg
renderInstallSection installationStage =
    let
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
    section
        [ class "section" ]
        [ div
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
        ]


renderBasicUsageSection : Html msg
renderBasicUsageSection =
    section
        [ class "section" ]
        [ div
            [ class "content" ]
            [ h1
                [ class "title is-2 has-text-vd-base-dark has-text-weight-light"
                ]
                [ text "Basic Usage" ]
            , p
                [ class "vd-regular-text" ]
                [ text vdOverviewText ]
            ]
        ]


vdOverviewText : String
vdOverviewText =
    """Once
        """
