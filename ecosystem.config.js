module.exports = {
  apps: [{
    name:             'cakezake-oms',
    script:           'server/index.js',
    cwd:              '/var/www/cakezake-oms',
    instances:        1,
    exec_mode:        'fork',
    watch:            false,
    max_memory_restart: '450M',
    node_args:        '--max-old-space-size=400',
    env_production: {
      NODE_ENV: 'production',
      PORT:     5001,
      HTTPS:    'true',
    },
  }],
};
