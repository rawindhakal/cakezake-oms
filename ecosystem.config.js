module.exports = {
  apps: [{
    name:         'cakezake-oms',
    script:       'server/index.js',
    instances:    'max',       // use all CPU cores
    exec_mode:    'cluster',
    watch:        false,
    max_memory_restart: '300M',
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
