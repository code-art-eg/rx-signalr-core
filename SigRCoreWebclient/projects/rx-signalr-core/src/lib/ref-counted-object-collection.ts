import { KeyedRefCountedObject } from './keyed-ref-counted-object';

/**
 * A collection to keep track of ref counted objects.
 */
export class RefCountedObjectCollection<TItem extends KeyedRefCountedObject<TKey>, TKey> {
  /**
   * internal collection that keeps track of objects by name
   */
  private readonly _collection: TItem[] = [];

  /**
   * constructor. initializes the collection to empty values.
   *
   * @param _factory factory to create a ref counted object
   */
  constructor(
    private readonly _factory: (key: TKey) => TItem,
    private readonly _compareKeys: (k1: TKey, k2: TKey) => boolean) {
  }

  /**
   * Get object by key.
   *
   * @param key key of the object to retrieve. If it doesn't exists, factory will be used to create one.
   */
  public getByKey(key: TKey): TItem {
    const item = this.findItemByKey(key);
    if (item) {
      // item found add reference
      item.addRef();
      return item;
    }
    const newItem = this._factory(key);
    newItem.addRef();
    this._collection.push(newItem);
    // register removal when complete
    // no need to keey track of subscription
    // since complete$ observable will always complete when it emits
    newItem.complete$.subscribe(() => {
      const index = this._collection.indexOf(newItem);
      if (index >= 0) {
        this._collection.splice(index, 1);
      }
    });
    return newItem;
  }

  /**
   * call stop on all items in the collection
   */
  public async stopAll(): Promise<void> {
    while (this._collection.length > 0) {
      const item = this._collection[this._collection.length - 1];
      // completion will take care of removing the item from the collection
      // completion should not trigger an error
      await this.stopItem(item, true);
    }
  }

  /**
   * call stop for a single item
   *
   * @param key key of item to stop
   */
  public async stopItemByKey(key: TKey): Promise<void> {
    const item = this.findItemByKey(key);
    if (item) {
      // The item complete event should take care of removal from collection
      await this.stopItem(item, false);
    }
  }

  /**
   * find an item by key
   *
   * @param key key for item to look for
   */
  private findItemByKey(key: TKey): TItem | undefined {
    for (const item of this._collection) {
      if (this._compareKeys(item.key, key)) {
        return item;
      }
    }
    return undefined;
  }

  /**
   * call stop on an item
   *
   * @param item item to stop
   * @param untilCompleted whether to continue calling stop until complete is triggered
   */
  private async stopItem(item: TItem, untilCompleted: boolean): Promise<void> {
    do {
      await item.stop();
    } while (untilCompleted && !item.complete);
  }
}
