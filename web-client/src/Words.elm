module Words exposing (ellipsify, pluralize, pluralizeWithNumericPrefix, singularAndPlural)


ellipsify : Int -> String -> String
ellipsify maxChars str =
    let
        totalChars =
            String.length str

        charsOver =
            totalChars - maxChars

        ellipsis =
            "..."
    in
    if charsOver <= 0 then
        str

    else
        String.dropRight (charsOver + String.length ellipsis) str
            |> (\cropString -> cropString ++ ellipsis)


pluralize : Int -> String -> String
pluralize number baseWord =
    if number == 1 then
        baseWord

    else
        baseWord ++ "s"


pluralizeWithNumericPrefix : Int -> String -> String
pluralizeWithNumericPrefix number baseWord =
    if number == 1 then
        "1 " ++ baseWord

    else
        String.fromInt number ++ " " ++ baseWord ++ "s"


type alias SingularAndPluralParams =
    { count : Int
    , singular : String
    , pluralPrefix : String
    , pluralSuffix : String
    }


singularAndPlural : SingularAndPluralParams -> String
singularAndPlural { count, singular, pluralPrefix, pluralSuffix } =
    if count == 1 then
        singular

    else
        pluralPrefix ++ String.fromInt count ++ pluralSuffix
