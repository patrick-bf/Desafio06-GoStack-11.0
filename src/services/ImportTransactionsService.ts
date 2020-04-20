import { getCustomRepository, getRepository, In } from 'typeorm';
import parseCsv from 'csv-parse';
import fs from 'fs';

import Transaction from '../models/Transaction';
import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';

interface DataCSV {
  title: string;
  type: 'income' | 'outcome';
  value: string;
  category: string;
}

class ImportTransactionsService {
  async execute(path: string): Promise<Transaction[]> {
    const transactionRepository = getCustomRepository(TransactionRepository);
    const categoryReposiory = getRepository(Category);

    const readStream = fs.createReadStream(path);

    const parse = parseCsv({
      from_line: 2,
    });

    const parseCSV = readStream.pipe(parse);

    const transactions: DataCSV[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async (row: any) => {
      const [title, type, value, category] = row.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return null;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoryReposiory.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoryReposiory.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoryReposiory.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const transactionsCreate = transactionRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: parseFloat(transaction.value),
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(transactionsCreate);

    await fs.promises.unlink(path);

    return transactionsCreate;
  }
}

export default ImportTransactionsService;
