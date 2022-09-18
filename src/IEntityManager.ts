import {IEntity} from "./IEntity";
import {IEntityQuery} from "./IEntityQuery";

export interface IEntityManager {
    set(entity: IEntity, data: Record<string, any>): void;
    unset(entity: IEntity, data: Record<string, any>): void;
    query<T extends IEntity>(tags: ReadonlySet<string> | ReadonlyArray<string>): IEntityQuery<T>;
    child(name?:string, owner?: IEntity, existingEntity?:any): IEntity;
    destroy(entity: IEntity): void;
    lookup(id:number):IEntity|null;
    getRoot():IEntity;
    apply():void;
}
