/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@supabase/ssr', '@supabase/supabase-js', 'yahoo-finance2'],
  images: {
    domains: ['localhost', 'supabase.co', 'qdnzoxnxcbdjcylsarly.supabase.co'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize yahoo-finance2 on the server side
      config.externals.push('yahoo-finance2')
    }
    
    // Disable vendor chunks splitting for Supabase modules
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        ...config.optimization.splitChunks?.cacheGroups,
        supabase: {
          test: /[\\/]node_modules[\\/]@supabase[\\/]/,
          name: 'supabase',
          priority: 20,
          chunks: 'all',
        },
      },
    }
    
    return config
  },
}

module.exports = nextConfig
