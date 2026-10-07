Platform adapters live here. Business rules remain in shared hooks/data/domain code.

Notifications:
- Web uses the in-app notification projection.
- Native can register an Expo push token when an EAS project id is configured.
- No service-role or push provider secret is stored in the client.
