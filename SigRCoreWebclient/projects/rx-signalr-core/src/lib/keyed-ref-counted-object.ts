import { RefCountedObject } from './ref-counted-object';

/**
 * A keyed RefCountedObject
 */
export abstract class KeyedRefCountedObject<TKey> extends RefCountedObject {

  /**
   * constructor
   *
   * @param name object name
   */
  constructor(public readonly key: TKey) {
    super();
  }
}
