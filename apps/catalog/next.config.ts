import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@catalog/contracts', '@catalog/domain', '@catalog/database', '@catalog/server'],
};

export default config;
