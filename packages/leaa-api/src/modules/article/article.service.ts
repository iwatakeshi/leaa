import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { Article, Category, Tag } from '@leaa/common/src/entrys';
import { IArticlesArgs, IArticleArgs, IGqlCtx } from '@leaa/api/src/interfaces';
import { ArticlesWithPaginationObject, CreateArticleInput, UpdateArticleInput } from '@leaa/common/src/dtos/article';
import {
  argsUtil,
  paginationUtil,
  curdUtil,
  stringUtil,
  dictUtil,
  authUtil,
  htmlUtil,
  msgUtil,
} from '@leaa/api/src/utils';

import { TagService } from '@leaa/api/src/modules/tag/tag.service';

const CLS_NAME = 'ArticleService';

@Injectable()
export class ArticleService {
  constructor(
    @InjectRepository(Article) private readonly articleRepository: Repository<Article>,
    @InjectRepository(Category) private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Tag) private readonly tagRepository: Repository<Tag>,
    private readonly tagService: TagService,
  ) {}

  async articles(args: IArticlesArgs, gqlCtx?: IGqlCtx): Promise<ArticlesWithPaginationObject> {
    const nextArgs: IArticlesArgs = argsUtil.format(args);

    const PRIMARY_TABLE = 'articles';
    const qb = await this.articleRepository.createQueryBuilder(PRIMARY_TABLE);

    // relations
    qb.leftJoinAndSelect(`${PRIMARY_TABLE}.categories`, 'categories');
    qb.leftJoinAndSelect(`${PRIMARY_TABLE}.tags`, 'tags');

    // q
    if (nextArgs.q) {
      const qLike = `%${nextArgs.q}%`;

      ['title', 'slug'].forEach(key => {
        qb.orWhere(`${PRIMARY_TABLE}.${key} LIKE :${key}`, { [key]: qLike });
      });
    }

    // tag
    if (nextArgs.tagName) {
      qb.andWhere('tags.name IN (:...tagName)', { tagName: nextArgs.tagName });
    }

    // category
    if (nextArgs.categoryName) {
      qb.andWhere('categories.name IN (:...categoryName)', { categoryName: nextArgs.categoryName });
    }

    if (nextArgs.categoryId) {
      qb.andWhere('categories.id IN (:...categoryId)', { categoryId: nextArgs.categoryId });
    }

    // order
    if (nextArgs.orderBy && nextArgs.orderSort) {
      qb.orderBy(`${PRIMARY_TABLE}.${nextArgs.orderBy}`, nextArgs.orderSort);
    }

    // can
    if (!gqlCtx?.user || (gqlCtx.user && !authUtil.can(gqlCtx.user, 'article.list-read--all-status'))) {
      qb.andWhere('status = :status', { status: 1 });
    }

    return paginationUtil.calcQbPageInfo({ qb, page: nextArgs.page, pageSize: nextArgs.pageSize });
  }

  async article(id: number, args?: IArticleArgs, gqlCtx?: IGqlCtx): Promise<Article | undefined> {
    let nextArgs: IArticleArgs = {};

    if (args) {
      nextArgs = args;
      nextArgs.relations = ['tags', 'categories'];
    }

    // can
    if (!gqlCtx?.user || (gqlCtx.user && !authUtil.can(gqlCtx.user, 'article.item-read--all-status'))) {
      nextArgs.where = { status: 1 };
    }

    return this.articleRepository.findOne(id, nextArgs);
  }

  async articleBySlug(slug: string, args?: IArticleArgs, gqlCtx?: IGqlCtx): Promise<Article | undefined> {
    const article = await this.articleRepository.findOne({ where: { slug } });
    if (!article) throw msgUtil.error({ t: ['_error:notFoundItem'], gqlCtx });

    return this.article(article.id, args, gqlCtx);
  }

  async createArticle(args: CreateArticleInput): Promise<Article | undefined> {
    const relationArgs: { categories?: Category[] } = {};

    // category
    let categoryObjects;
    if (args.categoryIds) {
      categoryObjects = await this.categoryRepository.findByIds(args.categoryIds);
    }

    relationArgs.categories = categoryObjects;

    return this.articleRepository.save({ ...args, ...relationArgs });
  }

  async updateArticle(id: number, args: UpdateArticleInput): Promise<Article | undefined> {
    if (curdUtil.isOneField(args, 'status')) return curdUtil.commonUpdate(this.articleRepository, CLS_NAME, id, args);

    const relationArgs: { tags?: Tag[]; categories?: Category[] } = {};
    const trimSlug = args.slug ? args.slug.trim().toLowerCase() : args.slug;
    const trimDescription = args.description ? args.description.trim() : args.description;

    // tags
    let tagObjects;
    if (args.tagIds && args.tagIds.length) tagObjects = await this.tagRepository.findByIds(args.tagIds);
    if (args.tagIds === null) tagObjects = [];

    relationArgs.tags = tagObjects;

    // category
    let categoryObjects;
    if (args.categoryIds) {
      categoryObjects = await this.categoryRepository.findByIds(args.categoryIds);
    } else if (args.categoryIds === null) {
      categoryObjects = [];
    }
    relationArgs.categories = categoryObjects;

    const nextArgs = {
      ...args,
      slug: !args.slug && args.title ? stringUtil.getSlug(args.title, args.title) : trimSlug,
      description: trimDescription,
    };

    // auto add tag from article content (by jieba)
    if (args.content && (!args.tagIds || (args.tagIds && args.tagIds.length === 0))) {
      const allText = htmlUtil.formatHtmlToText(args.content, args.title);

      // batch create tags
      relationArgs.tags = await this.tagService.createTags(dictUtil.cutTags(allText));

      // ⚠️ sync tags
      // execute only once when the article has no tag, reducing server pressure
      await this.tagService.syncTagsToDictFile();
    }

    return curdUtil.commonUpdate(this.articleRepository, CLS_NAME, id, nextArgs, relationArgs);
  }

  async deleteArticle(id: number): Promise<Article | undefined> {
    return curdUtil.commonDelete(this.articleRepository, CLS_NAME, id);
  }
}
