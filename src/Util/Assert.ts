export function assert<T>(condition:T|null, message:string = "Assertion failed"):asserts condition {
    if(!condition) {
        throw new Error('Assertion failed: ' + message);
    }
}

export function assertValue<T>(condition:T|null|undefined, message:string = "Assertion failed"):T {
    if(!condition) {
        throw new Error('Assertion failed: ' + message);
    }

    return <T>condition;
}
