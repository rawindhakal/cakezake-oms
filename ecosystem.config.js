module.exports = {
  apps: [{
    name:             'cakezake-oms',
    script:           'server/index.js',
    instances:        1,
    exec_mode:        'fork',
    watch:            false,
    max_memory_restart: '400M',
    env_production: {
      NODE_ENV: 'production',
      PORT:     5001,
      HTTPS:    'true',
    },
  }],
};
