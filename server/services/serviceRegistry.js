// Service registry to avoid circular dependencies
class ServiceRegistry {
  constructor() {
    this.services = {};
  }

  register(name, service) {
    this.services[name] = service;
  }

  get(name) {
    return this.services[name];
  }

  has(name) {
    return !!this.services[name];
  }
}

module.exports = new ServiceRegistry();
