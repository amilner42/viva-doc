module Asset exposing (Image, src, vdLandingIcon1, vdLandingIcon2, vdLandingIcon3, vdLogo, vdTitle)

{-| Assets, such as images, videos, and audio.

Don't expose asset URLs directly; this module should be in charge of all of them. Better to have
a single source of truth.

-}

import Html exposing (..)
import Html.Attributes as Attr


type Image
    = Image String



-- IMAGES


vdLogo : Image
vdLogo =
    image "vd-logo.svg"


vdTitle : Image
vdTitle =
    image "vd-title.svg"


vdLandingIcon1 : Image
vdLandingIcon1 =
    image "vd-landing-icon-1.svg"


vdLandingIcon2 : Image
vdLandingIcon2 =
    image "vd-landing-icon-2.svg"


vdLandingIcon3 : Image
vdLandingIcon3 =
    image "vd-landing-icon-3.svg"


image : String -> Image
image filename =
    Image ("/assets/images/" ++ filename)



-- USING IMAGES


src : Image -> Attribute msg
src (Image url) =
    Attr.src url
