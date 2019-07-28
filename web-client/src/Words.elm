module Words exposing (pluralize, pluralizeWithNumericPrefix, singularAndPlural)


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
