module Words exposing (pluralize, pluralizeWithNumericPrefix)


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
