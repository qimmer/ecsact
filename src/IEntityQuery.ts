import {IEntity, IEntityHelper, IEntityInternal} from "./IEntity";
import {IArchetype} from "@src/IArchetype";

export interface IEntityQuery<T extends IEntity = IEntity> {
    forEach(callback: (entity:T) => void):void;
    map<R>(callback: (entity:T) => R):R[];
    filter(callback: (entity:T) => boolean):T[];
    singleton():T;
    trySingleton():T|null;

    addArchetype(archetype:IArchetype):void;

    getTags(): ReadonlySet<string>;

    toArray(): T[];
    hasAny():boolean;

    subscribeAdded(callback:(entity:T)=>void):IEntityQuery<T>;
    subscribeRemoved(callback:(entity:(T&IEntityHelper))=>void):IEntityQuery<T>;
}
