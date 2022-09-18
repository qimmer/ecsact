import {IEntityManager} from "@src/IEntityManager";
import {EntityQuery} from "@src/EntityQuery";
import {EntityReservedMembers, IEntity, IEntityInternal} from "@src/IEntity";
import {JSONPath} from "jsonpath-plus";
import {IEntityQuery} from "@src/IEntityQuery";
import {ArchetypeManager} from "@src/ArchetypeManager";
import {IArchetype} from "@src/IArchetype";

export type InternalEntity = IEntity & IEntityInternal;

export class EntityManager implements IEntityManager {
    private queries: EntityQuery<IEntity>[];
    private entities: IEntity[];
    private entityPathMap: WeakMap<IEntity, string>;
    private pathEntityMap: Record<string, IEntity>
    private archetypeManager: ArchetypeManager;
    private idCounter: number;
    private root: IEntity;
    private unresolvedReferences: {
        root: IEntity,
        entity: IEntity & Record<string, any>,
        property: string|number,
        path: string
    }[];
    private queryMap: Record<string, IEntityQuery<IEntity>>;

    constructor() {
        this.archetypeManager = new ArchetypeManager();
        this.queries = [];
        this.entities = [];
        this.entityPathMap = new WeakMap<IEntity, string>();
        this.pathEntityMap = {};
        this.idCounter = 0;
        this.unresolvedReferences = [];
        this.queryMap = {};

        this.archetypeManager.onNewArchetype = archetype => this.onNewArchetype(archetype);

        this.root = this.child("root");
    }

    getRoot(): IEntity {
        return this.root;
    }

    private onNewArchetype(archetype:IArchetype) {
        this.queries.forEach(x => {
            if(this.archetypeManager.matches(archetype, x.getTags())) {
                x.addArchetype(archetype);
                archetype.queries.add(x);
            }
        })
    }

    private addHelper<T>(this:IEntityInternal, tag:string) {
        return <T><any>(<EntityManager>this._entityManager).archetypeManager.add(<IEntity><any>this, tag);
    }

    private removeHelper<T>(this:IEntityInternal, tag:string) {
        return <T><any>(<EntityManager>this._entityManager).archetypeManager.remove(<IEntity><any>this, tag);
    }

    private hasHelper<T>(this:IEntityInternal, tag:string) {
        return this._archetype.tags.has(tag);
    }

    private setHelper<T>(this:IEntityInternal, data:any, overwrite?:boolean) {
        return <T><any>(<EntityManager>this._entityManager).set(<IEntity><any>this, data, overwrite);
    }

    private unsetHelper<T>(this:IEntityInternal, data:any) {
        return <T><any>(<EntityManager>this._entityManager).unset(<IEntity><any>this, data);
    }

    private childHelper<T>(this:IEntityInternal, name:string, existingEntity?:any) {
        return <T><any>(<EntityManager>this._entityManager).child(name, <IEntity><any>this, existingEntity);
    }

    private destroyHelper(this:IEntityInternal) {
        (<EntityManager>this._entityManager).destroy(<IEntity><any>this);
    }

    private applyHelper<T>(this:IEntityInternal) {
        (<EntityManager>this._entityManager).apply();
        return <T><any>this;
    }

    private initializeHelpers(entity:Partial<IEntity>):IEntity {
        entity.add = <any>this.addHelper.bind(<any>entity);
        entity.remove = <any>this.removeHelper.bind(<any>entity);
        entity.child = <any>this.childHelper.bind(<any>entity);
        entity.set = <any>this.setHelper.bind(<any>entity);
        entity.unset = <any>this.unsetHelper.bind(<any>entity);
        entity.destroy = <any>this.destroyHelper.bind(<any>entity);
        entity.has = <any>this.hasHelper.bind(<any>entity);
        entity.apply = <any>this.applyHelper.bind(<any>entity);
        entity.getTags = () => (<InternalEntity>entity)._archetype.tags;
        entity.getOwner = () => (<InternalEntity>entity)._owner;
        entity.getName = () => (<InternalEntity>entity)._name;
        entity.getChildren = () => (<InternalEntity>entity)._children;
        return <IEntity>entity;
    }

    private createQuery<T extends IEntity>(tags: ReadonlySet<string>) {
        let query = new EntityQuery<T>(tags);
        this.archetypeManager.getMatches(tags).forEach(archetype => {
            archetype.queries.add(query);
            query.addArchetype(archetype);
        });
        this.queries.push(query);
        return query;
    }

    private parseValue(owner:IEntity, dest:any, src:any, key:string|number, overwrite:boolean, root?: IEntity) {
        let destValue = dest[key],
            srcValue = src[key];

        if(typeof key === "string" && key[0] === '$') {
            if(!dest[key] || overwrite) {
                dest[key] = srcValue;
            }
            return;
        }

        if(typeof srcValue === 'object' && srcValue !== null) {
            if(Array.isArray(srcValue)) {
                if(overwrite || (!destValue && srcValue)) {
                    dest[key] = destValue = new Array(src[key].length);
                    srcValue.forEach((element, index) => {
                        this.parseValue(owner, destValue, srcValue, index, overwrite, root);
                    });
                }
            } else if(srcValue._archetype) {
                dest[key] = srcValue;
            } else if(srcValue.tags) {
                if(destValue && !destValue._archetype) {
                    destValue = dest[key] = this.child(''+key, owner).set(destValue, undefined, root);
                }
                if(!destValue) {
                    destValue = this.child('' + key, owner);
                    dest[key] = destValue;
                }

                this.set(destValue, srcValue, overwrite, root);
            } else if (srcValue.constructor !== Object) {
                dest[key] = srcValue;
            } else {
                if(!destValue) {
                    dest[key] = destValue = {};
                }
                for(let key in srcValue) {
                    if(EntityReservedMembers.has(key) || (destValue[key] !== undefined && destValue[key] !== null && overwrite === false)) {
                        continue;
                    }

                    this.parseValue(destValue._archetype ? destValue : owner, destValue, srcValue, key, overwrite, root);
                }
            }
        } else if(root && typeof srcValue === 'string' && (srcValue.startsWith('$') || srcValue.startsWith('@'))) {
            this.unresolvedReferences.push({
                root: root,
                entity: dest,
                property: key,
                path: srcValue
            });
        } else if((overwrite !== false) || (dest[key] === undefined || dest[key] === null)) {
            dest[key] = srcValue;
        }
    }

    apply() {
        this.archetypeManager.apply();
    }

    lookup(id: number): IEntity | null {
        return this.entities[id] || null;
    }

    set(entity: IEntity, data: Record<string, any>, overwrite?:boolean, root?:IEntity) {
        let resolve = !root;

        if(!root) {
            root = entity;
        }

        for (let key in data) {
            if(EntityReservedMembers.has(key)) {
                continue;
            }

            if (key === 'tags') {
                (<string[]>data.tags).forEach(tag => this.archetypeManager.add(entity, tag));
            } else {
                this.parseValue(entity, entity, data, key, (overwrite === undefined || overwrite === true) ? true : false, root);
            }
        }

        if(resolve) {
            this.unresolvedReferences.forEach(unresolved => {
                let foundEntity = unresolved.path[0] === '@'
                    ? JSONPath({path: '$' + unresolved.path.substring(1), json: unresolved.root})[0]
                    : JSONPath({path: unresolved.path, json: this.root})[0];

                if(foundEntity === undefined) {
                    throw new Error("Could not resolve absolute JsonPath: " + unresolved.path);
                } else {
                    unresolved.entity[unresolved.property] = foundEntity;
                }
            });
            this.unresolvedReferences = [];
        }

        return entity;
    }

    unset(entity: IEntity, data: Record<string, any>) {
        let entityData = <Record<string, any>>entity;
        for (let key in data) {
            if(EntityReservedMembers.has(key)) {
                continue;
            }

            if (Array.isArray(data[key])) {
                <any[]>(data[key]).forEach((x:any, i:number) => this.unset(<IEntity>entityData[key][i], x));
            } else if (typeof data[key] === "object") {
                if(entityData[key]._archetype) {
                    entityData[key].destroy();
                    delete entityData[key];
                } else {
                    for(let subKey in data[key]) {
                        this.unset(<IEntity>entityData[key][subKey], data[key][subKey]);
                    }
                }
            }

            delete entityData[key];
        }

        return entity;
    }

    query<T extends IEntity>(tags: ReadonlySet<string> | ReadonlyArray<string>): IEntityQuery<T> {
        let queryKey = Array.from(tags).sort().join('|');
        return <IEntityQuery<T>>(this.queryMap[queryKey] || (this.queryMap[queryKey] = this.createQuery<T>(new Set(tags))));
    }

    child(name: string, owner?: IEntity, existingEntity?: any) {
        let partialEntity = <IEntityInternal>(existingEntity || {});

        if(existingEntity && (<IEntityInternal><any>existingEntity)._localId !== undefined) {
            return existingEntity;
        }

        partialEntity._owner = owner ? owner : null;
        partialEntity._children = [];
        partialEntity._localId = this.idCounter++;
        partialEntity._entityManager = this;
        partialEntity._archetype = this.archetypeManager.getRoot();
        partialEntity._name = name;

        let entity = this.initializeHelpers(<Partial<IEntity>>partialEntity);

        this.entities[<number>partialEntity._localId] = entity;
        if(owner) {
            (<IEntityInternal><any>owner)._children.push(entity);
        }

        if(existingEntity) {
            this.set(entity, existingEntity);
        }

        return entity;
    }

    destroy(entity: IEntity): void {
        let archetypedEntity = <Partial<InternalEntity>>entity;

        if (archetypedEntity._archetype) {
            Array.from(archetypedEntity._archetype.tags).reverse().forEach(tag => this.archetypeManager.remove(entity, tag));
        }

        if (archetypedEntity._children) {
            archetypedEntity._children.slice().forEach(child => this.destroy(child));
            archetypedEntity._children = [];
        }

        if (archetypedEntity._owner && (<InternalEntity>archetypedEntity._owner)._children) {
            let ownerChildren = <IEntity[]>(<InternalEntity>archetypedEntity._owner)._children;
            ownerChildren.splice(ownerChildren.indexOf(entity), 1);
        }

        archetypedEntity._owner = null;
    }
}
