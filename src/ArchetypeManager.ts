import {IEntity, IEntityInternal} from "@src/IEntity";
import {InternalEntity} from "@src/EntityManager";
import {IArchetype} from "@src/IArchetype";
import {Filter, FilterFunc} from "@src/IEntityQuery";

export class ArchetypeManager {
    private rootArchetype: IArchetype;
    private archetypes: Record<string, IArchetype>;
    private archetypeChanges: {
        from: IArchetype,
        to: IArchetype,
        entity: IEntity & IEntityInternal
    }[];

    public onNewArchetype?: (archetype: IArchetype) => void;

    constructor() {
        this.rootArchetype = {
            id: "root",
            tags: new Set(),
            entities: new Set(),
            addEdges: {},
            removeEdges: {},
            queries: new Set()
        };

        this.archetypes = {"": this.rootArchetype};

        this.archetypeChanges = [];
    }

    getMatches(filter: Filter): IArchetype[] {
        return Object.values(this.archetypes).filter(archetype => this.matches(archetype, filter));
    }

    matches(archetype: IArchetype, filter: Filter): boolean {
        let matches = true;

        if((<ReadonlySet<string>>filter).has !== undefined) {
            let filterSet = <ReadonlySet<string>>filter;
            filterSet.forEach(tag => {
                if (!matches) return;

                if (tag[0] === "!") {
                    if (archetype.tags.has(tag.substring(1))) {
                        matches = false;
                        return;
                    }
                } else {
                    if (!archetype.tags.has(tag)) {
                        matches = false;
                        return;
                    }
                }
            });
        } else {
            let filterFunc = <FilterFunc>filter;
            return filterFunc(tag => archetype.tags.has(tag));
        }

        return matches;
    }

    apply() {
        let changes;

        while (this.archetypeChanges.length > 0) {
            changes = this.archetypeChanges;
            this.archetypeChanges = [];

            changes.forEach(change => {
                if (change.from !== change.to) {
                    change.from.entities.delete(change.entity);
                    change.entity._archetype = change.to;
                    change.to.entities.add(change.entity);
                }
            });

            changes.forEach(change => {
                if (change.from !== change.to) {
                    change.from.queries.forEach(q => {
                        if (!change.to.queries.has(q)) {
                            q.emitRemoved(change.entity)
                        }
                    });
                    change.to.queries.forEach(q => {
                        if (!change.from.queries.has(q)) {
                            q.emitAdded(change.entity)
                        }
                    });
                }
            });
        }
    }

    add(entity: IEntity, tag: string) {
        let internalEntity = <InternalEntity>entity,
            existingChange = this.archetypeChanges[internalEntity._localId],
            oldArchetype = existingChange?.to || internalEntity._archetype || this.rootArchetype;

        if (oldArchetype.tags.has(tag)) {
            return entity;
        }

        let newArchetype = this.getAddEdge(oldArchetype, tag);

        if (existingChange) {
            existingChange.to = newArchetype;
        } else {
            this.archetypeChanges[internalEntity._localId] = {
                from: oldArchetype,
                to: newArchetype,
                entity: <IEntityInternal & IEntity>entity
            }
        }

        return entity;
    }

    remove(entity: IEntity, tag: string) {
        let internalEntity = <InternalEntity>entity,
            existingChange = this.archetypeChanges[internalEntity._localId],
            oldArchetype = existingChange?.to || internalEntity._archetype || this.rootArchetype;

        if (!oldArchetype.tags.has(tag)) {
            return entity;
        }

        let newArchetype = this.getRemoveEdge(existingChange?.to || oldArchetype, tag);

        if (existingChange) {
            existingChange.to = newArchetype;
        } else {
            this.archetypeChanges[internalEntity._localId] = {
                from: oldArchetype,
                to: newArchetype,
                entity: <IEntityInternal & IEntity>entity
            }
        }

        return entity;
    }

    private getAddEdge(archetype: IArchetype, tag: string): IArchetype {
        let edge = archetype.addEdges[tag];
        if (!edge) {
            if (archetype.tags.has(tag)) {
                return archetype.addEdges[tag] = archetype;
            }

            let sortedAddTags = Array.from(archetype.tags).concat([tag]).sort(),
                addTags = new Set(sortedAddTags),
                archetypeKey = sortedAddTags.join('|'),
                existingArchetype = this.archetypes[archetypeKey];

            if (existingArchetype) {
                return archetype.addEdges[tag] = existingArchetype;
            }

            let newArchetype = this.archetypes[archetypeKey] = archetype.addEdges[tag] = {
                id: Array.from(addTags).join('|'),
                addEdges: {},
                removeEdges: {[tag]: archetype},
                tags: addTags,
                entities: new Set(),
                queries: new Set()
            }

            if (this.onNewArchetype) {
                this.onNewArchetype(newArchetype);
            }

            return newArchetype;
        }

        return edge;
    }

    private getRemoveEdge(archetype: IArchetype, tag: string): IArchetype {
        let edge = archetype.removeEdges[tag];
        if (!edge) {
            if (!archetype.tags.has(tag)) {
                return archetype.removeEdges[tag] = archetype;
            }

            let sortedAddTags = Array.from(archetype.tags).filter(atag => atag !== tag).sort(),
                removeTags = new Set(sortedAddTags),
                archetypeKey = sortedAddTags.join('|'),
                existingArchetype = this.archetypes[archetypeKey];

            if (existingArchetype) {
                return archetype.removeEdges[tag] = existingArchetype;
            }

            let newArchetype = this.archetypes[archetypeKey] = archetype.removeEdges[tag] = {
                id: Array.from(removeTags).join('|'),
                addEdges: {[tag]: archetype},
                removeEdges: {},
                tags: removeTags,
                entities: new Set(),
                queries: new Set()
            }

            if (this.onNewArchetype) {
                this.onNewArchetype(newArchetype);
            }

            return newArchetype;
        }

        return edge;
    }

    getRoot() {
        return this.rootArchetype;
    }
}
