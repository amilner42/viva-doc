/**
 * Reusable non-project-specific types located here.
 */

/**
 * Make all properties and nested properties in T requied.
 */
export type DeepRequired<T> = {
    [P in keyof T]-?: DeepRequired<T[P]>;
};

/**
 * Make specific properties required at all depths.
 */
export type DeepRequiredFields< T, K extends keyof any > =
    T extends object ?
        ({ [P1 in (Extract<keyof T, K>)]-?: DeepRequiredFields<T[P1], K> } &
        { [P2 in keyof Pick<T, Exclude<keyof T, K>>]: DeepRequiredFields<T[P2], K> })
    :
        T
