import {Filter, IEntityQuery} from "@src/IEntityQuery";
import {IEntity, IEntityHelper} from "@src/IEntity";
import {IArchetype} from "@src/IArchetype";

export class EntityQuery<T extends IEntity> implements IEntityQuery<T> {
    private queryFilter: Filter;
    private archetypes: IArchetype[];
    private addedSubscriptions: ((entity:IEntity)=>void)[];
    private removedSubscriptions: ((entity:IEntity)=>void)[];

    constructor(queryFilter:Filter) {
        this.queryFilter = queryFilter;
        this.archetypes = [];
        this.addedSubscriptions = [];
        this.removedSubscriptions = [];
    }

    toArray(): T[] {
        let result:T[] = [];
        this.archetypes.forEach(archetype => {
            archetype.entities.forEach(entity => {
                result.push(<T>entity);
            });
        });
        return result;
    }

    getFilter():Filter {
        return this.queryFilter;
    }

    addArchetype(archetype: IArchetype): void {
        this.archetypes.push(archetype);
    }

    forEach(callback: (entity: T) => void): void {
        this.archetypes.forEach(archetype => {
            archetype.entities.forEach(entity => {
                callback(<T><any>entity);
            });
        });
    }

    map<R>(callback: (entity: T) => R): R[] {
        let result:R[] = [];
        this.archetypes.forEach(archetype => {
            archetype.entities.forEach(entity => {
                result.push(callback(<T><any>entity));
            });
        });
        return result;
    }

    filter(callback: (entity: T) => boolean): T[] {
        let result:T[] = [];
        this.archetypes.forEach(archetype => {
            archetype.entities.forEach(entity => {
                if(callback(<T><any>entity)) {
                    result.push(<T><any>entity);
                }
            });
        });
        return result;
    }

    singleton(): T {
        if(this.archetypes.reduce((acc, val) => acc + val.entities.size, 0) !== 1) {
            throw new Error("Less or more than 1 instance of singleton!");
        }

        return <T><any>this.archetypes.filter(x => x.entities.size > 0)[0].entities.keys().next().value;
    }

    trySingleton(): T|null {
        if(this.archetypes.reduce((acc, val) => acc + val.entities.size, 0) !== 1) {
            return null;
        }

        return <T><any>this.archetypes.filter(x => x.entities.size > 0)[0].entities.keys().next().value;
    }

    subscribeAdded(callback: (entity: T) => void):IEntityQuery<T> {
        this.addedSubscriptions.push(<(entity: IEntity)=>void>callback);

        this.archetypes.forEach(archetype => {
            archetype.entities.forEach(entity => {
                callback(<T>entity);
            });
        });

        return this;
    }

    subscribeRemoved(callback: (entity: (T&IEntityHelper)) => void):IEntityQuery<T> {
        this.removedSubscriptions.push(<(entity: IEntity)=>void>callback);
        return this;
    }

    emitAdded(entity:T) {
        this.addedSubscriptions.forEach(s => s(entity));
    }

    emitRemoved(entity:T) {
        this.removedSubscriptions.forEach(s => s(entity));
    }

    hasAny(): boolean {
        return this.archetypes.some(a => a.entities.size > 0);
    }
}

