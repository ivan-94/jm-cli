/**
 * Copyright (c) 2017-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')

const MarkdownBlock = CompLibrary.MarkdownBlock /* Used to read markdown */
const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(`${process.cwd()}/siteConfig.js`)

function imgUrl(img) {
  return `${siteConfig.baseUrl}img/${img}`
}

function docUrl(doc, language) {
  return `${siteConfig.baseUrl}docs/${language ? `${language}/` : ''}${doc}`
}

function pageUrl(page, language) {
  return siteConfig.baseUrl + (language ? `${language}/` : '') + page
}

class Button extends React.Component {
  render() {
    return (
      <div className="pluginWrapper buttonWrapper">
        <a className="button" href={this.props.href} target={this.props.target}>
          {this.props.children}
        </a>
      </div>
    )
  }
}

Button.defaultProps = {
  target: '_self',
}

const SplashContainer = props => (
  <div className="homeContainer">
    <div className="homeSplashFade">
      <div className="wrapper homeWrapper">{props.children}</div>
    </div>
  </div>
)

const Logo = props => (
  <div className="projectLogo">
    <img src={props.img_src} alt="Project Logo" />
  </div>
)

const ProjectTitle = () => (
  <h2 className="projectTitle">
    {siteConfig.title}
    <small>{siteConfig.tagline}</small>
  </h2>
)

const PromoSection = props => (
  <div className="section promoSection">
    <div className="promoRow">
      <div className="pluginRowBlock">{props.children}</div>
    </div>
  </div>
)

class HomeSplash extends React.Component {
  render() {
    const language = this.props.language || ''
    return (
      <SplashContainer>
        <Logo img_src={imgUrl('docusaurus.svg')} />
        <div className="inner">
          <ProjectTitle />
          <PromoSection>
            <Button href={docUrl('getting-started.html', language)}>Getting Started</Button>
          </PromoSection>
        </div>
      </SplashContainer>
    )
  }
}

const Block = props => (
  <Container padding={['bottom', 'top']} id={props.id} background={props.background}>
    <GridBlock align="center" contents={props.children} layout={props.layout} />
  </Container>
)

const Features = () => (
  <Block layout="fourColumn">
    {[
      {
        content: '不需要关心底层编译细节, 容易维护, 专注业务开发',
        title: '一个命令, 一个依赖',
      },
      {
        content: '只支持Typescript, 配合使用Tslint约束代码规范, Prettier保持统一的代码格式',
        title: 'Typescript + Tslint + Prettier',
      },
      {
        content: '使用语义化版本, 随时更新到兼容版本, 使用最新特性',
        title: '同步更新',
      },
    ]}
  </Block>
)

const FeaturesPost = () => (
  <Block layout="fourColumn">
    {[
      {
        content: '模板可以使用任意的npm包',
        title: '自定义模板',
      },
      {
        content: '只提供最小化的配置项, 不提供eject, 从代码到项目结构, 保证统一, 面向团队',
        title: '约定大于配置',
      },
      {
        content: 'jm start! 即刻运行项目',
        title: '全局模式',
      },
    ]}
  </Block>
)

const FeatureCallout = () => (
  <div className="productShowcaseSection paddingBottom" style={{ textAlign: 'center' }}>
    <h2>Feature Callout</h2>
    <MarkdownBlock>These are features of this project</MarkdownBlock>
  </div>
)

const LearnHow = () => (
  <Block background="light">
    {[
      {
        content: 'Talk about learning how to use this',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'right',
        title: 'Learn How',
      },
    ]}
  </Block>
)

const TryOut = () => (
  <Block id="try">
    {[
      {
        content: 'Talk about trying this out',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'left',
        title: 'Try it Out',
      },
    ]}
  </Block>
)

const Description = () => (
  <Block background="dark">
    {[
      {
        content: 'This is another description of how this project is useful',
        image: imgUrl('docusaurus.svg'),
        imageAlign: 'right',
        title: 'Description',
      },
    ]}
  </Block>
)

const Showcase = props => {
  if ((siteConfig.users || []).length === 0) {
    return null
  }

  const showcase = siteConfig.users
    .filter(user => user.pinned)
    .map(user => (
      <a href={user.infoLink} key={user.infoLink}>
        <img src={user.image} alt={user.caption} title={user.caption} />
      </a>
    ))

  return (
    <div className="productShowcaseSection paddingBottom">
      <h2>Who is Using This?</h2>
      <p>This project is used by all these people</p>
      <div className="logos">{showcase}</div>
      <div className="more-users">
        <a className="button" href={pageUrl('users.html', props.language)}>
          More {siteConfig.title} Users
        </a>
      </div>
    </div>
  )
}

class Index extends React.Component {
  render() {
    const language = this.props.language || ''

    return (
      <div>
        <HomeSplash language={language} />
        <div className="mainContainer">
          <Features />
          <FeaturesPost />
        </div>
      </div>
    )
  }
}

module.exports = Index
