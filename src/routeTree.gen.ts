/* eslint-disable */
// @ts-nocheck
import { Route as rootRouteImport } from './routes/__root'
import { Route as SitemapDotxmlRouteImport } from './routes/sitemap[.]xml'
import { Route as RulesRouteImport } from './routes/rules'
import { Route as PlayRouteImport } from './routes/play'
import { Route as OptionsRouteImport } from './routes/options'
import { Route as HighscoreRouteImport } from './routes/highscore'
import { Route as CreditsRouteImport } from './routes/credits'
import { Route as IndexRouteImport } from './routes/index'

const SitemapDotxmlRoute = SitemapDotxmlRouteImport.update({ id: '/sitemap.xml', path: '/sitemap.xml', getParentRoute: () => rootRouteImport } as any)
const RulesRoute = RulesRouteImport.update({ id: '/rules', path: '/rules', getParentRoute: () => rootRouteImport } as any)
const PlayRoute = PlayRouteImport.update({ id: '/play', path: '/play', getParentRoute: () => rootRouteImport } as any)
const OptionsRoute = OptionsRouteImport.update({ id: '/options', path: '/options', getParentRoute: () => rootRouteImport } as any)
const HighscoreRoute = HighscoreRouteImport.update({ id: '/highscore', path: '/highscore', getParentRoute: () => rootRouteImport } as any)
const CreditsRoute = CreditsRouteImport.update({ id: '/credits', path: '/credits', getParentRoute: () => rootRouteImport } as any)
const IndexRoute = IndexRouteImport.update({ id: '/', path: '/', getParentRoute: () => rootRouteImport } as any)

export interface FileRoutesByFullPath { '/': typeof IndexRoute; '/credits': typeof CreditsRoute; '/highscore': typeof HighscoreRoute; '/options': typeof OptionsRoute; '/play': typeof PlayRoute; '/rules': typeof RulesRoute; '/sitemap.xml': typeof SitemapDotxmlRoute }
export interface FileRoutesByTo extends FileRoutesByFullPath {}
export interface FileRoutesById { __root__: typeof rootRouteImport; '/': typeof IndexRoute; '/credits': typeof CreditsRoute; '/highscore': typeof HighscoreRoute; '/options': typeof OptionsRoute; '/play': typeof PlayRoute; '/rules': typeof RulesRoute; '/sitemap.xml': typeof SitemapDotxmlRoute }
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths: '/' | '/credits' | '/highscore' | '/options' | '/play' | '/rules' | '/sitemap.xml'
  fileRoutesByTo: FileRoutesByTo
  to: '/' | '/credits' | '/highscore' | '/options' | '/play' | '/rules' | '/sitemap.xml'
  id: '__root__' | '/' | '/credits' | '/highscore' | '/options' | '/play' | '/rules' | '/sitemap.xml'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren { IndexRoute: typeof IndexRoute; CreditsRoute: typeof CreditsRoute; HighscoreRoute: typeof HighscoreRoute; OptionsRoute: typeof OptionsRoute; PlayRoute: typeof PlayRoute; RulesRoute: typeof RulesRoute; SitemapDotxmlRoute: typeof SitemapDotxmlRoute }

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/sitemap.xml': { id: '/sitemap.xml'; path: '/sitemap.xml'; fullPath: '/sitemap.xml'; preLoaderRoute: typeof SitemapDotxmlRouteImport; parentRoute: typeof rootRouteImport }
    '/rules': { id: '/rules'; path: '/rules'; fullPath: '/rules'; preLoaderRoute: typeof RulesRouteImport; parentRoute: typeof rootRouteImport }
    '/play': { id: '/play'; path: '/play'; fullPath: '/play'; preLoaderRoute: typeof PlayRouteImport; parentRoute: typeof rootRouteImport }
    '/options': { id: '/options'; path: '/options'; fullPath: '/options'; preLoaderRoute: typeof OptionsRouteImport; parentRoute: typeof rootRouteImport }
    '/highscore': { id: '/highscore'; path: '/highscore'; fullPath: '/highscore'; preLoaderRoute: typeof HighscoreRouteImport; parentRoute: typeof rootRouteImport }
    '/credits': { id: '/credits'; path: '/credits'; fullPath: '/credits'; preLoaderRoute: typeof CreditsRouteImport; parentRoute: typeof rootRouteImport }
    '/': { id: '/'; path: '/'; fullPath: '/'; preLoaderRoute: typeof IndexRouteImport; parentRoute: typeof rootRouteImport }
  }
}

const rootRouteChildren: RootRouteChildren = { IndexRoute, CreditsRoute, HighscoreRoute, OptionsRoute, PlayRoute, RulesRoute, SitemapDotxmlRoute }
export const routeTree = rootRouteImport._addFileChildren(rootRouteChildren)._addFileTypes<FileRouteTypes>()