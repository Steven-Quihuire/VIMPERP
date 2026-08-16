import { describe, expect, it } from 'vitest';

import {
  getCompanyOwnerPermissionKeys,
  getCompanyUserPermissionKeys,
  inventoryDocumentsPermissionKeys,
  inventoryStockPermissionKeys,
  permissionCatalogSeeds,
} from './permissions';

describe('inventory permission seeds', () => {
  it('defines additive stock and document permission keys in order', () => {
    expect(inventoryStockPermissionKeys).toEqual([
      'inventory.stock.read',
      'inventory.stock.write',
      'inventory.stock.adjust',
    ]);
    expect(inventoryDocumentsPermissionKeys).toEqual([
      'inventory.documents.read',
      'inventory.documents.write',
      'inventory.documents.confirm',
      'inventory.documents.cancel',
    ]);
  });

  it('exposes inventory capability keys through the catalog seeds and company helpers', () => {
    expect(
      permissionCatalogSeeds
        .filter((permission) => permission.key.startsWith('inventory.'))
        .map((permission) => permission.key),
    ).toEqual([
      'inventory.stock.read',
      'inventory.stock.write',
      'inventory.stock.adjust',
      'inventory.documents.read',
      'inventory.documents.write',
      'inventory.documents.confirm',
      'inventory.documents.cancel',
    ]);
    expect(
      permissionCatalogSeeds
        .filter((permission) => permission.key.startsWith('inventory.'))
        .map((permission) => permission.family),
    ).toEqual([
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
      'normal',
    ]);
    expect(getCompanyOwnerPermissionKeys(['inventory'])).toEqual(
      expect.arrayContaining(['catalog.read', 'catalog.write', 'catalog.delete']),
    );
    expect(getCompanyOwnerPermissionKeys(['inventory'])).toEqual(
      expect.arrayContaining([
        'inventory.stock.read',
        'inventory.stock.write',
        'inventory.stock.adjust',
        'inventory.documents.read',
        'inventory.documents.write',
        'inventory.documents.confirm',
        'inventory.documents.cancel',
      ]),
    );
    expect(getCompanyUserPermissionKeys(['inventory'])).toEqual(
      expect.not.arrayContaining(['catalog.delete']),
    );
    expect(getCompanyUserPermissionKeys(['inventory'])).toEqual(
      expect.arrayContaining([
        'catalog.read',
        'catalog.write',
        'inventory.stock.read',
        'inventory.stock.write',
        'inventory.stock.adjust',
        'inventory.documents.read',
        'inventory.documents.write',
        'inventory.documents.confirm',
        'inventory.documents.cancel',
      ]),
    );
  });
});
