import {JSONPath} from "jsonpath-plus";
import {EntityReservedMembers} from "../IEntity";
import {assert} from "@src/Util/Assert";

export function resolveJsonPaths(root:any, object?:any, resolvedList?:Set<any>) {
    resolvedList = (typeof resolvedList === "undefined") ? new Set() : resolvedList;

    if(typeof object === "undefined") {
        object = root;
    }

    if((object === null) || (typeof object !== 'object') || (!Array.isArray(object) && (object.constructor !== Object)) || resolvedList.has(object)) {
        return object;
    }

    resolvedList.add(object);

    for(let property in object) {
        let value = object[property];

        if(typeof value === 'string' && (value.startsWith("$.") || value.startsWith("@."))) {
            object[property] = JSONPath({path: value, json: root})[0];

            assert(object[property] !== undefined, "Could not resolve JsonPath: " + value);
        } else {
            resolveJsonPaths(root, value, resolvedList);
        }
    }

    return object;
}

export function resolveEntity(path:string[], root:any) {
    let entity = root;
    path.forEach(segment => {
        if(entity) {
            entity = entity[segment];
        }
    });

    return entity;
}

export function purify(key:any, value:any, purifiedObjects:Set<Object>) {
    if(key === '_archetype') {
        return Array.from(value.tags);
    }
    if(EntityReservedMembers.has(key)) {
        return undefined;
    }

    if(value instanceof Set) {
        value = Array.from(value);
    }
    if(value && typeof value === 'object' && !Array.isArray(value) && value.constructor !== Object) {
        return undefined;
    }
    if(typeof value === 'function') {
        return undefined;
    }

    if(typeof value === 'object' && purifiedObjects.has(value)) {
        return undefined;
    }

    return value;
}
