# nestjs-prisma-dynamic-resolvers

This package allows you to dynamically resolve the relations between Prisma
models in your Nestjs application.

The usage is pretty simple and the defining navigations between two different
Prisma models are possible in two different ways:
- Using the `@NavigationProperty` decorator.
- Using the `registerNavigation` function.

After defining your navigations, the application will not have its effect
immediately to prevent unexpected scenarios during the setup process of
your module. This also lets the developer to comment out a single line to debug
the navigation effect between models.

Use the `@UseDynamicResolvers` decoraor on your model classes which have
navigation to another model classes and with these decorators/functions the
navigation setup will be completed.

As this package is designed to be used with the Prisma package, you should
provide your `PrismaClient` instance to the dynamic resolvers.

## Setup Example

Assume you have the following model classes:

```ts
// user.ts

import { UserRole } from './user-role'
import { ID, Field } from '@nestjs/graphql'
import { NavigationProperty, UseDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@ObjectType()
@UseDynamicResolvers({ moduleName: 'user' })
export class User {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string

  @Field()
  surname!: string

  @Field(() => [ UserRole ], {
    defaultValue: []
  })
  @NavigationProperty({ target: UserRole })
  roles: UserRole[] = []
}

```

```ts
// user-role.ts

import { ID, Field } from '@nestjs/graphql'
import { UseDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@ObjectType()
@UseDynamicResolvers({ moduleName: 'user' })
export class UserRole {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string
}

```

```ts
// user.module.ts
import { provideDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@Module({
  // ...
  providers: [
    // ...
    PrismaService,
    ...provideDynamicResolvers(PrismaService, 'user')
  ]
  // ...
})
export class UserModule {}
```

And that's it! Now you can execute the following `GraphQL` query easily:

_-- Assuming you have `allUsers` query_

```gql
query {
  allUsers { 
    id
    name
    surname

    roles {
      id
      name
    }
  }
}
```

## Advanced Example

Now the best part of this library is when you have nested references between
database table models. Like, when a class is referencing another class that
also references another class which all are also Prisma models.

In addition to that, as JavaScript/TypeScript is not allowing recursive imports
we will define navigations in another file.

Assuming you have another class:
```ts
// user-claim.ts
import { ID, Field } from '@nestjs/graphql'
import { UserRole } from './user-role'
import { NavigationProperty, UseDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@ObjectType()
@UseDynamicResolvers({ moduleName: 'user' })
export class UserClaim {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string

  @Field(() => [ UserRole ], {
    defaultValue: []
  })
  roles: UserRole[] = []
}
```

And your `User` class is updated to this:
```ts
// user.ts
import { UserClaim } from './user-claim'
import { UserRole } from './user-role'
import { ID, Field } from '@nestjs/graphql'
import { NavigationProperty, UseDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@ObjectType()
@UseDynamicResolvers({ moduleName: 'user' })
export class User {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string

  @Field()
  surname!: string

  @Field(() => [ UserRole ], {
    defaultValue: []
  })
  @NavigationProperty({ target: UserRole })
  roles: UserRole[] = []

  @Field(() => [ UserRole ], {
    defaultValue: []
  })
  @NavigationProperty({ target: UserClaim })
  claims: UserClaim[] = []
}

```

And assume your `UserRole` class also have `UserClaim`s:
```ts
// user-role.ts

import { UserClaim } from './user-claim'
import { ID, Field } from '@nestjs/graphql'
import { NavigationProperty, UseDynamicResolvers } from 'nestjs-prisma-dynamic-resolvers'

@ObjectType()
@UseDynamicResolvers({ moduleName: 'user' })
export class UserRole {
  @Field(() => ID)
  id!: string

  @Field()
  name!: string

  @Field(() => [ UserClaim ], {
    defaultValue: []
  })
  claims: UserClaim[] = []
}

```

In another file importing these two circular classes:
```ts
// index.ts
import { UserClaim } from './user-claim'
import { UserRole } from './user-role'
import { registerNavigation } from 'nestjs-prisma-dynamic-resolvers'

registerNavigation({
  from: {
    source: UserRole,
    withProperty: 'claims',
  },
  to: {
    target: UserClaim,
    withProperty: 'roles',
  },
  relation: '*:*',
})
```

Now even with these recursively dependent, nested classes, the dynamic
resolvers will still be generated from one model to another and the complex
queries will still work.

Example `GraphQL` Query: 

```gql
query { 
  allUsers { 
    id
    name
    surname

    claims {
      name
    }

    roles { 
      id
      name

      claims {
        id
        name
      }
    }
  }
}
```

# Support
To support the project, you can send donations to following addresses: 

```md
- Bitcoin     : bc1qtut2ss8udkr68p6k6axd0na6nhvngm5dqlyhtn
- Bitcoin Cash: qzmmv43ztae0tfsjx8zf4wwnq3uk6k7zzgcfr9jruk
- Ether       : 0xf542BED91d0218D9c195286e660da2275EF8eC84
```
