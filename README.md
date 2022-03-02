## About

GitHub Action to extract metadata (tags, labels) for Docker. This action is particularly useful if used with
[Docker Build Push](https://github.com/docker/build-push-action) action.

This action was originally created by [@crazy-max](https://github.com/crazy-max/ghaction-docker-meta/). He created a v2
with many changes that I don't like. Therefore, I forked the v1 and maintain it now.

![Screenshot](.github/ghaction-docker-meta.png)
___

## Usage

### Basic

| Event           | Ref                           | Commit SHA | Docker Tags                         |
|-----------------|-------------------------------|------------|-------------------------------------|
| `pull_request`  | `refs/pull/2/merge`           | `a123b57`  | `pr-2`                              |
| `push`          | `refs/heads/master`           | `cf20257`  | `master`                            |
| `push`          | `refs/heads/my/branch`        | `a5df687`  | `my-branch`                         |
| `push tag`      | `refs/tags/v1.2.3`            | `ad132f5`  | `v1.2.3`, `latest`                  |
| `push tag`      | `refs/tags/v2.0.8-beta.67`    | `fc89efd`  | `v2.0.8-beta.67`, `latest`          |

```yaml
name: ci

on:
  push:
    branches:
      - '**'
    tags:
      - 'v*'
  pull_request:

jobs:
  docker:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Docker meta
        id: docker_meta
        uses: MarcelCoding/ghaction-docker-meta@v1
        with:
          images: name/app

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v1

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Login to DockerHub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64,linux/386
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.docker_meta.outputs.tags }}
          labels: ${{ steps.docker_meta.outputs.labels }}
```

### Semver

| Event           | Ref                           | Commit SHA | Docker Tags                         |
|-----------------|-------------------------------|------------|-------------------------------------|
| `pull_request`  | `refs/pull/2/merge`           | `a123b57`  | `pr-2`                              |
| `push`          | `refs/heads/master`           | `cf20257`  | `master`                            |
| `push`          | `refs/heads/my/branch`        | `a5df687`  | `my-branch`                         |
| `push tag`      | `refs/tags/v1.2.3`            | `ad132f5`  | `1.2.3`, `1.2`, `latest`            |
| `push tag`      | `refs/tags/v2.0.8-beta.67`    | `fc89efd`  | `2.0.8-beta.67`                     |

```yaml
name: ci

on:
  push:
    branches:
      - '**'
    tags:
      - 'v*'
  pull_request:

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Docker meta
        id: docker_meta
        uses: MarcelCoding/ghaction-docker-meta@v1
        with:
          images: name/app
          tag-semver: |
            {{version}}
            {{major}}.{{minor}}

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v1

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v1

      - name: Login to DockerHub
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          file: ./Dockerfile
          platforms: linux/amd64,linux/arm64,linux/386
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.docker_meta.outputs.tags }}
          labels: ${{ steps.docker_meta.outputs.labels }}
```

## Customizing

### inputs

Following inputs can be used as `step.with` keys

> `List` type is a newline-delimited string
> ```yaml
> label-custom: |
>   org.opencontainers.image.title=MyCustomTitle
>   org.opencontainers.image.description=Another description
>   org.opencontainers.image.vendor=MyCompany
> ```

> `CSV` type is a comma-delimited string
> ```yaml
> images: name/app,ghcr.io/name/app
> ```

| Name                | Type     | Description                                                                                   |
|---------------------|----------|-----------------------------------------------------------------------------------------------|
| `images`            | List/CSV | List of Docker images to use as base name for tags                                            |
| `tag-edge`          | Bool     | Enable edge branch tagging (default `true`)                                                   |
| `tag-edge-branch`   | String   | Branch that will be tagged as edge (default `repo.default_branch`)                            |
| `tag-semver`        | List/CSV | Handle Git tag as semver [template](#handle-semver-tag) if possible (default `true`)          |
| `tag-latest`        | Bool     | Set `latest` Docker tag if `tag-semver`, `tag-match` or Git tag event occurs (default `true`) |
| `tag-schedule`      | String   | Tag to apply to schedule tag (default `nightly`)                                              |
| `tag-custom`        | List/CSV | List of custom tags                                                                           |
| `tag-custom-only`   | Bool     | Only use `tag-custom` as Docker tags                                                          |
| `label-custom`      | List     | List of custom labels                                                                         |
| `sep-tags`          | String   | Separator to use for tags output (default `\n`)                                               |
| `sep-labels`        | String   | Separator to use for labels output (default `\n`)                                             |
| `flavor`            | String   | Tag suffix to be appended, specifying the image flavor (default ``)                           |
| `main-flavor`       | String   | Enable tags without flavor suffix (default `true`)                                            |

> `tag-semver` is mutually exclusive

### outputs

Following outputs are available

| Name      | Type   | Description          |
|-----------|--------|----------------------|
| `version` | String | Docker image version |
| `tags`    | String | Docker tags          |
| `labels`  | String | Docker labels        |     

## Notes

### Latest tag

Latest Docker tag will be generated by default on `push tag` event. If for example you push the `v1.2.3` Git tag, you
will have at the output of this action the Docker tags `v1.2.3` and `latest`. But you can allow the latest tag to be
generated only if `tag-semver` is a valid [semver](https://semver.org/). Can be disabled if `tag-latest` is `false`.

### Handle semver tag

If Git tag is a valid [semver](https://semver.org/) you can handle it to output multi Docker tags at once.
`tag-semver` supports multi-line [Handlebars template](https://handlebarsjs.com/guide/) with the following inputs:

| Git tag            | `tag-semver`                                             | Valid              | Output tags                | Output version               |
|--------------------|----------------------------------------------------------|--------------------|----------------------------|------------------------------|
| `v1.2.3`           | `{{raw}}`                                                | :white_check_mark: | `v1.2.3`, `latest`         | `v1.2.3`                     |
| `v1.2.3`           | `{{version}}`                                            | :white_check_mark: | `1.2.3`, `latest`          | `1.2.3`                      |
| `v1.2.3`           | `{{major}}.{{minor}}`                                    | :white_check_mark: | `1.2`, `latest`            | `1.2`                        |
| `v1.2.3`           | `v{{major}}`                                             | :white_check_mark: | `v1`, `latest`             | `v1`                         |
| `v1.2.3`           | `{{minor}}`                                              | :white_check_mark: | `2`, `latest`              | `2`                          |
| `v1.2.3`           | `{{patch}}`                                              | :white_check_mark: | `3`, `latest`              | `3`                          |
| `v1.2.3`           | `{{major}}.{{minor}}`<br>`{{major}}.{{minor}}.{{patch}}` | :white_check_mark: | `1.2`, `1.2.3`, `latest`   | `1.2`*                       |
| `v2.0.8-beta.67`   | `{{raw}}`                                                | :white_check_mark: | `2.0.8-beta.67`**          | `2.0.8-beta.67`              |
| `v2.0.8-beta.67`   | `{{version}}`                                            | :white_check_mark: | `2.0.8-beta.67`            | `2.0.8-beta.67`              |
| `v2.0.8-beta.67`   | `{{major}}.{{minor}}`                                    | :white_check_mark: | `2.0.8-beta.67`**          | `2.0.8-beta.67`              |
| `release1`         | `{{raw}}`                                                | :x:                | `release1`                 | `release1`                   |

> *First occurrence of `tag-semver` will be taken as `output.version`

> **Pre-release (rc, beta, alpha) will only extend `{{version}}` as tag because they are updated frequently,
> and contain many breaking changes that are (by the author's design) not yet fit for public consumption.

### `flavor` examples

| Git tag                 | `flavor` | `main-flavor` | `tag-latest` | Output tags                                 |
|-------------------------|----------|---------------|--------------|---------------------------------------------|
| `v1.2.3`                | `debian` | `true`        | `true`       | `1.2.3-debian`, `1.2.3`, `debian`, `latest` |
| `v1.2.3`                | `debian` | `true`        | `false`      | `1.2.3-debian`, `1.2.3`                     |
| `v1.2.3`                | `alpine` | `false`       | `true`       | `1.2.3-alpine`, `alpine`                    |
| `v1.2.3`                | `alpine` | `false`       | `false`      | `1.2.3-alpine`                              |
| `v1.2.3`                | ``       | ``            | `true`       | `1.2.3`, `latest`                           |
| `v1.2.3`                | ``       | ``            | `false`      | `1.2.3`                                     |

### Overwrite labels

If some of the [OCI Image Format Specification](https://github.com/opencontainers/image-spec/blob/master/annotations.md)
labels generated are not suitable, you can overwrite them like this:

```yaml
      - name: Docker meta
        id: docker_meta
        uses: MarcelCoding/ghaction-docker-meta@v1
        with:
          images: name/app
          label-custom: |
            maintainer=CrazyMax
            org.opencontainers.image.title=MyCustomTitle
            org.opencontainers.image.description=Another description
            org.opencontainers.image.vendor=MyCompany
```

## Keep up-to-date with GitHub Dependabot

Since [Dependabot](https://docs.github.com/en/github/administering-a-repository/keeping-your-actions-up-to-date-with-github-dependabot)
has [native GitHub Actions support](https://docs.github.com/en/github/administering-a-repository/configuration-options-for-dependency-updates#package-ecosystem)
, to enable it on your GitHub repo all you need to do is add the `.github/dependabot.yml` file:

```yaml
version: 2

updates:
  # Maintain dependencies for GitHub Actions
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "daily"
```
