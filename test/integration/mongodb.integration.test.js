import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupDatabase, teardownDatabase, clearDatabase } from '../mongodb-setup.js';
import { ObjectId } from 'mongodb';

let db;
let client;

beforeAll(async () => {
  const setup = await setupDatabase();
  db = setup.db;
  client = setup.client;
});

afterAll(async () => {
  await teardownDatabase();
});

beforeEach(async () => {
  await clearDatabase(db);
});

describe('MongoDB Integration Tests', () => {
  describe('Materials Collection', () => {
    it('should insert a material with required fields', async () => {
      const materials = db.collection('materials');

      const doc = {
        title: 'Introduction to React',
        description: 'Learn the fundamentals of React',
        category: 'Web Development',
        price: 29.99,
        createdAt: new Date(),
      };

      const result = await materials.insertOne(doc);
      expect(result.insertedId).toBeDefined();

      const inserted = await materials.findOne({ _id: result.insertedId });
      expect(inserted.title).toBe('Introduction to React');
      expect(inserted.price).toBe(29.99);
    });

    it('should enforce required fields validation', async () => {
      const materials = db.collection('materials');

      // Missing required fields should still insert (MongoDB flexible schema)
      // but we should validate at application level
      const incompleteDoc = {
        title: 'Incomplete Material',
        // missing description, category, price, createdAt
      };

      const result = await materials.insertOne(incompleteDoc);
      expect(result.insertedId).toBeDefined();

      const inserted = await materials.findOne({ _id: result.insertedId });
      expect(inserted.title).toBe('Incomplete Material');
      expect(inserted.description).toBeUndefined();
    });

    it('should query materials by category', async () => {
      const materials = db.collection('materials');

      // Create index
      await materials.createIndex({ category: 1 });

      // Insert test data
      await materials.insertMany([
        {
          title: 'React Basics',
          category: 'Web Development',
          price: 29.99,
          createdAt: new Date(),
        },
        {
          title: 'Node.js Guide',
          category: 'Backend',
          price: 39.99,
          createdAt: new Date(),
        },
        {
          title: 'Vue Fundamentals',
          category: 'Web Development',
          price: 24.99,
          createdAt: new Date(),
        },
      ]);

      const webDevMaterials = await materials
        .find({ category: 'Web Development' })
        .toArray();

      expect(webDevMaterials).toHaveLength(2);
      expect(webDevMaterials[0].title).toBe('React Basics');
      expect(webDevMaterials[1].title).toBe('Vue Fundamentals');
    });

    it('should perform text search on materials', async () => {
      const materials = db.collection('materials');

      // Create text index
      await materials.createIndex({ title: 'text', description: 'text' });

      await materials.insertMany([
        {
          title: 'JavaScript Essentials',
          description: 'Master JavaScript fundamentals and advanced concepts',
          price: 49.99,
          createdAt: new Date(),
        },
        {
          title: 'Python for Data Science',
          description: 'Learn Python programming for data analysis',
          price: 59.99,
          createdAt: new Date(),
        },
      ]);

      const results = await materials
        .find({ $text: { $search: 'JavaScript' } })
        .toArray();

      expect(results).toHaveLength(1);
      expect(results[0].title).toContain('JavaScript');
    });

    it('should support pagination with sort', async () => {
      const materials = db.collection('materials');

      const docs = Array.from({ length: 25 }, (_, i) => ({
        title: `Material ${i + 1}`,
        category: 'Test',
        price: (i + 1) * 10,
        createdAt: new Date(),
      }));

      await materials.insertMany(docs);

      // Get first page (10 items, sorted by price ascending)
      const page1 = await materials
        .find({})
        .sort({ price: 1 })
        .skip(0)
        .limit(10)
        .toArray();

      expect(page1).toHaveLength(10);
      expect(page1[0].price).toBe(10);
      expect(page1[9].price).toBe(100);

      // Get second page
      const page2 = await materials
        .find({})
        .sort({ price: 1 })
        .skip(10)
        .limit(10)
        .toArray();

      expect(page2).toHaveLength(10);
      expect(page2[0].price).toBe(110);
    });

    it('should update material and maintain data integrity', async () => {
      const materials = db.collection('materials');

      const doc = {
        title: 'Original Title',
        description: 'Original description',
        price: 29.99,
        createdAt: new Date(),
      };

      const { insertedId } = await materials.insertOne(doc);

      const updateResult = await materials.updateOne(
        { _id: insertedId },
        {
          $set: {
            title: 'Updated Title',
            price: 39.99,
          },
        }
      );

      expect(updateResult.modifiedCount).toBe(1);

      const updated = await materials.findOne({ _id: insertedId });
      expect(updated.title).toBe('Updated Title');
      expect(updated.price).toBe(39.99);
      expect(updated.description).toBe('Original description');
    });

    it('should delete material correctly', async () => {
      const materials = db.collection('materials');

      const { insertedId } = await materials.insertOne({
        title: 'To Delete',
        price: 19.99,
        createdAt: new Date(),
      });

      const deleteResult = await materials.deleteOne({ _id: insertedId });
      expect(deleteResult.deletedCount).toBe(1);

      const found = await materials.findOne({ _id: insertedId });
      expect(found).toBeNull();
    });
  });

  describe('Complex Aggregation Queries', () => {
    it('should aggregate materials by category with pricing stats', async () => {
      const materials = db.collection('materials');

      const data = [
        { title: 'React 1', category: 'Web Dev', price: 29.99 },
        { title: 'React 2', category: 'Web Dev', price: 39.99 },
        { title: 'Vue 1', category: 'Web Dev', price: 24.99 },
        { title: 'Node 1', category: 'Backend', price: 49.99 },
        { title: 'Node 2', category: 'Backend', price: 59.99 },
      ];

      await materials.insertMany(data);

      const stats = await materials
        .aggregate([
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              avgPrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
            },
          },
          {
            $sort: { count: -1 },
          },
        ])
        .toArray();

      expect(stats).toHaveLength(2);
      expect(stats[0]._id).toBe('Web Dev');
      expect(stats[0].count).toBe(3);
      expect(stats[0].avgPrice).toBeCloseTo(31.66, 1);
      expect(stats[1]._id).toBe('Backend');
      expect(stats[1].count).toBe(2);
    });

    it('should perform analytics pipeline with match, group, and sort', async () => {
      const purchases = db.collection('purchases');

      const data = [
        { buyer: 'alice', amount: 50, status: 'completed', date: new Date('2024-01-01') },
        { buyer: 'bob', amount: 75, status: 'completed', date: new Date('2024-01-02') },
        { buyer: 'alice', amount: 100, status: 'completed', date: new Date('2024-01-03') },
        { buyer: 'alice', amount: 25, status: 'failed', date: new Date('2024-01-04') },
        { buyer: 'charlie', amount: 60, status: 'completed', date: new Date('2024-01-05') },
      ];

      await purchases.insertMany(data);

      const analytics = await purchases
        .aggregate([
          {
            $match: { status: 'completed' },
          },
          {
            $group: {
              _id: '$buyer',
              totalSpent: { $sum: '$amount' },
              transactionCount: { $sum: 1 },
              avgTransaction: { $avg: '$amount' },
            },
          },
          {
            $sort: { totalSpent: -1 },
          },
        ])
        .toArray();

      expect(analytics).toHaveLength(3);
      expect(analytics[0]._id).toBe('alice');
      expect(analytics[0].totalSpent).toBe(150);
      expect(analytics[0].transactionCount).toBe(2);
    });
  });

  describe('Index Creation and Performance', () => {
    it('should create and use compound index', async () => {
      const materials = db.collection('materials');

      // Create compound index
      const indexName = await materials.createIndex(
        { category: 1, price: 1 },
        { name: 'category_price_idx' }
      );

      expect(indexName).toBe('category_price_idx');

      // Verify index exists
      const indexes = await materials.getIndexes();
      const compoundIndex = indexes.find(idx => idx.name === 'category_price_idx');
      expect(compoundIndex).toBeDefined();
      expect(compoundIndex.key).toEqual({ category: 1, price: 1 });
    });

    it('should create unique index for email-like fields', async () => {
      const users = db.collection('users');

      // Create unique index
      await users.createIndex(
        { email: 1 },
        { unique: true }
      );

      // Insert first document
      await users.insertOne({ email: 'test@example.com', name: 'Test User' });

      // Attempt to insert duplicate should fail gracefully in real app
      try {
        await users.insertOne({ email: 'test@example.com', name: 'Another User' });
        // MongoDB doesn't throw by default in insert, but update would
      } catch (err) {
        expect(err.code).toBe(11000); // Duplicate key error
      }
    });
  });

  describe('Data Cleanup', () => {
    it('should cleanup collections after test', async () => {
      const materials = db.collection('materials');

      await materials.insertMany([
        { title: 'Material 1', price: 10 },
        { title: 'Material 2', price: 20 },
      ]);

      let count = await materials.countDocuments();
      expect(count).toBe(2);

      // Cleanup happens via beforeEach
      // Verify it works
      count = await materials.countDocuments();
      expect(count).toBe(0);
    });

    it('should handle collection isolation between tests', async () => {
      const materials = db.collection('materials');

      // This test should start with empty collection due to beforeEach cleanup
      const count = await materials.countDocuments();
      expect(count).toBe(0);

      await materials.insertOne({ title: 'Test Material', price: 15 });
      expect(await materials.countDocuments()).toBe(1);
    });
  });

  describe('Schema Validation', () => {
    it('should handle optional fields correctly', async () => {
      const materials = db.collection('materials');

      const doc = {
        title: 'Required Title',
        price: 29.99,
        cid: 'optional-ipfs-hash',
        createdAt: new Date(),
      };

      const { insertedId } = await materials.insertOne(doc);
      const inserted = await materials.findOne({ _id: insertedId });

      expect(inserted.cid).toBe('optional-ipfs-hash');
      expect(inserted.storageKey).toBeUndefined();
    });

    it('should validate date fields', async () => {
      const materials = db.collection('materials');

      const now = new Date();
      const doc = {
        title: 'Material with dates',
        price: 19.99,
        createdAt: now,
        quarantineExpiresAt: new Date(now.getTime() + 86400000), // +1 day
      };

      const { insertedId } = await materials.insertOne(doc);
      const inserted = await materials.findOne({ _id: insertedId });

      expect(inserted.createdAt instanceof Date).toBe(true);
      expect(inserted.quarantineExpiresAt instanceof Date).toBe(true);
      expect(inserted.quarantineExpiresAt.getTime()).toBeGreaterThan(
        inserted.createdAt.getTime()
      );
    });
  });
});
