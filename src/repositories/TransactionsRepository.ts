import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const incomes = await this.find({
      select: ['value'],
      where: { type: 'income' },
    });

    const totalIncome = incomes
      .map(income => income.value)
      .reduce(
        (accumulatedValue, atualValue) => accumulatedValue + atualValue,
        0,
      );

    const outcomes = await this.find({
      select: ['value'],
      where: { type: 'outcome' },
    });

    const totalOutcome = outcomes
      .map(outcome => outcome.value)
      .reduce(
        (accumulatedValue, atualValue) => accumulatedValue + atualValue,
        0,
      );

    const total = totalIncome - totalOutcome;

    const balance = {
      income: totalIncome,
      outcome: totalOutcome,
      total,
    };
    return balance;
  }
}

export default TransactionsRepository;
