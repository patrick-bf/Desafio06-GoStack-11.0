import { getCustomRepository, getRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);

    const balance = await transactionsRepository.getBalance();

    if (balance.total < value && type === 'outcome') {
      throw new AppError(
        'Your balance is negative, you can not create an outcome transaction',
      );
    }

    const categoryRepository = getRepository(Category);

    let existCategory = await categoryRepository.findOne({
      where: { title: category },
    });

    if (!existCategory) {
      existCategory = categoryRepository.create({ title: category });

      await categoryRepository.save(existCategory);
    }

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
      category_id: existCategory.id,
    });

    await transactionsRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
