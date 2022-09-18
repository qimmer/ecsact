export function assert<T>(condition:T|null, message:string):NonNullable<T> {
    if(!condition) {
        throw new Error('Assertion failed: ' + message);
    }

    return <NonNullable<T>>condition;
}
