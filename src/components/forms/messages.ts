export const formMessages = {
  en: {
    required: 'Enter a number.', number: 'Enter a complete, finite number.',
    min: (value: number) => `Enter ${value} or more.`, max: (value: number) => `Enter ${value} or less.`,
    step: (value: number) => value === 1 ? 'Enter a whole number.' : `Use increments of ${value}.`,
  },
  zh: {
    required: '请输入数字。', number: '请输入完整的有限数值。',
    min: (value: number) => `请输入不小于 ${value} 的数值。`, max: (value: number) => `请输入不大于 ${value} 的数值。`,
    step: (value: number) => value === 1 ? '请输入整数。' : `请输入 ${value} 的整数倍。`,
  },
};
