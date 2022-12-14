import {IEntity, IEntityHelper, IEntityInternal} from "@src/IEntity";
import {IArchetype} from "@src/IArchetype";

export type FilterFunc = (has:(tag:string)=>boolean)=>boolean;
export type Filter = ReadonlySet<string>|FilterFunc;

export interface IEntityQuery<T extends IEntity = IEntity> {


    forEach(callback: (entity:T) => void):void;
    map<R>(callback: (entity:T) => R):R[];
    filter(callback: (entity:T) => boolean):T[];
    singleton():T;
    trySingleton():T|null;

    addArchetype(archetype:IArchetype):void;

    getFilter(): Filter;

    toArray(): T[];
    hasAny():boolean;

    subscribeAdded(callback:(entity:T)=>void):IEntityQuery<T>;
    subscribeRemoved(callback:(entity:(T&IEntityHelper))=>void):IEntityQuery<T>;
}
