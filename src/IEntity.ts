import {IEntityManager} from "./IEntityManager";
import {IArchetype} from "@src/IArchetype";

export interface IEntityInternal {
    _entityManager: IEntityManager;
    _archetype: Readonly<IArchetype>;
    _children: IEntity[];
    _owner: IEntity|null;
    _localId: number;
    _name: string;
}

type ArrElement<ArrType> = ArrType extends readonly (infer ElementType)[]
    ? ElementType
    : never;

type EntityProperty<T> = T extends IEntity
    ? (EntityDescriptor<T>|Omit<T, "add" | "remove" | "child" | "destroy" | "has" | "set" | "unset" | "getTags" | "getName" | "getOwner" | "getChildren" | "apply">|string)
    : T extends (Object & { length?: never; })
        ? Omit<T, "add" | "remove" | "child" | "destroy" | "has" | "set" | "unset" | "getTags" | "getName" | "getOwner" | "getChildren" | "apply">|PartialEntity<T>
        : T extends { length?: number; byteLength?: never, substring?: never; }
            ? Array<EntityProperty<ArrElement<T>>>
            : T;

type PartialEntity<TEntity extends Omit<Object, "add" | "remove" | "child" | "destroy" | "has" | "set" | "unset" | "getTags" | "getName" | "getOwner" | "getChildren" | "apply">> = {
    [P in keyof TEntity]?: EntityProperty<TEntity[P]>;
};

export type EntityDescriptor<TEntity extends IEntity> = {tags?: string[]}&PartialEntity<Omit<TEntity, "add" | "remove" | "child" | "destroy" | "has" | "set" | "unset" | "getTags" | "getName" | "getOwner" | "getChildren" | "apply">>;

export type Mandatory<T, K extends keyof T> = T & { [P in K]-?: T[P] }

type UnsetValues<T> = Partial<Exclude<{tags?: string[]}&{
    [P in keyof T]?: T[P] extends (Object & { length?: never; })
        ? (UnsetValues<T[P]>|null)
        : (
            T[P] extends { length?: number; substring: never; }
                ? (ArrayLike<UnsetValues<ArrElement<T[P]>>>)
                : null
            );
}, IEntityHelper>>

export interface IEntityHelper {
    add<T extends IEntity = this>(tag:string):this&T;
    remove<T extends IEntity = this>(tag:string):this&Partial<T>;
    set<T extends IEntity = this>(values:(T extends IEntity ? EntityDescriptor<T> : {}), overwrite?:boolean):IEntity&T&this;
    unset<T extends IEntity = this>(values:Exclude<UnsetValues<T>, IEntityHelper>):IEntity&T&this;
    child(name?: string, existingEntity?:any):IEntity;
    destroy():void;
    has(tag:string):boolean;
    getTags():ReadonlySet<string>
    getName():string
    getOwner():IEntity|null
    getChildren():ReadonlyArray<IEntity>
    apply<T extends IEntity, PT extends IEntity = this>():T&PT;
}

export interface ITags {
    tags: string[];
}

export interface IEntity extends IEntityHelper {

}

export const EntityReservedMembers = new Set([
    "_archetype",
    "_entityManager",
    "_owner",
    "_children",
    "_localId",
    "_name",
    "add",
    "remove",
    "set",
    "child",
    "destroy",
    "has",
]);
